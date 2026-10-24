using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
using System.Threading;
using Microsoft.Win32.SafeHandles;

// Finalization closes an abandoned job handle (kill-on-close) if construction or
// a later managed exception prevents the normal explicit cleanup path.
public sealed class GridJobHandle : SafeHandleZeroOrMinusOneIsInvalid {
  public int CloseError;
  public GridJobHandle():base(true) {}
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr value);
  protected override bool ReleaseHandle() { bool ok=CloseHandle(handle); if(!ok) CloseError=Marshal.GetLastWin32Error(); return ok; }
}

// A failed teardown must leave the responsible caller an actionable owner,
// rather than relying on discovery through a private passive retention registry.
public sealed class GridTeardownException : AggregateException {
  public GridJob CleanupOwner { get; private set; }
  public GridTeardownException(GridJob owner,string message,IEnumerable<Exception> errors):base(message,errors) { CleanupOwner=owner; }
}

// Test tooling only. Suspended creation prevents descendants escaping before assignment.
public sealed partial class GridJob : IDisposable {
  [StructLayout(LayoutKind.Sequential)] struct IO { public ulong a,b,c,d,e,f; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC {
    public long user, job; public uint flags; public UIntPtr min, max;
    public uint active; public UIntPtr affinity; public uint priority, scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct EXT {
    public BASIC basic; public IO io; public UIntPtr processMemory, jobMemory, peakProcess, peakJob;
  }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct START {
    public uint cb; public string reserved, desktop, title;
    public uint x,y,w,h,cx,cy,fill,flags; public ushort show, reserved2;
    public IntPtr bytes, input, output, error;
  }
  [StructLayout(LayoutKind.Sequential)] struct INFO { public IntPtr process, thread; public uint pid, tid; }
  [StructLayout(LayoutKind.Sequential)] public struct MEMORY {
    public uint length, load; public ulong total, available, pageTotal, pageAvailable, virtualTotal, virtualAvailable, extended;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern GridJobHandle CreateJobObject(IntPtr attributes, string name);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(GridJobHandle job, int type, ref EXT data, uint size);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(GridJobHandle job, int type, IntPtr data, uint size, out uint returned);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(GridJobHandle job, int type, out EXT data, uint size, out uint returned);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, StringBuilder command, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref START start, out INFO info);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(GridJobHandle job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint code);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(GridJobHandle job, uint code);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool GlobalMemoryStatusEx(ref MEMORY memory);
  GridJobHandle handle;
  // Exceptional children remain owned even if assignment failed. This registry
  // is allocated before CreateProcess and is never inferred from job membership.
  enum StartupState { Creating,Created,Assigned,Transferred,CreationFailed,Cleaned,Unresolved }
  sealed class RecoveryChild {
    public IntPtr Process,Thread,Confirmation;
    public StartupState State=StartupState.Creating;
    public bool InProgress=true;
  }
  readonly List<RecoveryChild> recovery=new List<RecoveryChild>();
  readonly object recoverySync=new object();
  bool stopping;
  bool teardownBusy,disposeRequested,deferredDisposal,automaticHandoffAttempted,disposalComplete,deferredConfirmed;
  readonly List<Exception> teardownHistory=new List<Exception>();
  readonly HashSet<Exception> recordedTeardownErrors=new HashSet<Exception>(ReferenceEqualityComparer.Instance);
  Action injectDeferredProofFailure; // Private deterministic regression seam only.
  long startupGeneration;
  static readonly HashSet<GridJob> unresolvedOwners=new HashSet<GridJob>();
  RecoveryChild ReserveChild() {
    var child=new RecoveryChild();
    lock(recoverySync) {
      if(stopping) {
        var error=new InvalidOperationException("Startup admission closed by Stop/Dispose");
        RecordTeardownError(error); throw error;
      }
      recovery.Add(child); startupGeneration++;
    }
    return child;
  }
  void CheckStartupAdmission() {
    lock(recoverySync) if(stopping) {
      var error=new OperationCanceledException("Startup interrupted by Stop/Dispose");
      RecordTeardownError(error); throw error;
    }
  }
  void CompleteStartup(RecoveryChild child,List<Exception> errors=null) {
    var completionErrors=errors ?? new List<Exception>();
    bool ownsHandoff=false;
    lock(recoverySync) lock(child) {
      if(child.InProgress) {
        if(child.Process!=IntPtr.Zero || child.Thread!=IntPtr.Zero) child.State=StartupState.Unresolved;
        else if(child.State==StartupState.Creating) child.State=StartupState.CreationFailed;
        else if(child.State!=StartupState.Transferred) child.State=StartupState.Cleaned;
        child.InProgress=false;
        if(child.State==StartupState.Transferred && stopping && completionErrors.Count==0)
          completionErrors.Add(new OperationCanceledException("Transferred startup completed after teardown request"));
      }
      // No lost wakeup: either this last startup claims cleanup, or the current
      // teardown owner observes settled startup before atomically releasing busy.
      if(deferredDisposal && !automaticHandoffAttempted && !disposalComplete && !teardownBusy && !HasActiveStartup()) {
        teardownBusy=true; ownsHandoff=true;
      }
    }
    try { if(ownsHandoff) FinishTeardown(completionErrors); }
    finally { RecordTeardownErrors(completionErrors); }
    if(errors==null && completionErrors.Count>0) throw new GridTeardownException(this,"Startup cleanup handoff failed",completionErrors);
  }
  bool HasActiveStartup() {
    foreach(var child in recovery) if(child.InProgress) return true;
    return false; // Caller holds recoverySync.
  }
  void RetainIfUnresolved() {
    lock(recoverySync) {
      bool unresolved=disposeRequested && !disposalComplete;
      unresolved|=HasTelemetryOwnership;
      foreach(var child in recovery) lock(child) unresolved|=child.InProgress || child.Process!=IntPtr.Zero || child.Thread!=IntPtr.Zero || child.Confirmation!=IntPtr.Zero;
      lock(unresolvedOwners) { if(unresolved) unresolvedOwners.Add(this); else unresolvedOwners.Remove(this); }
    }
  }
  bool ClaimTeardown(bool disposing,List<Exception> errors) {
    lock(recoverySync) {
      stopping=true;
      disposeRequested|=disposing;
      if(disposing && HasActiveStartup()) deferredDisposal=true;
      if(teardownBusy) {
        errors.Add(new InvalidOperationException("Teardown already owned by another caller; completion not confirmed"));
        RetainIfUnresolved();
        return false;
      }
      teardownBusy=true;
      return true;
    }
  }
  void RecordTeardownErrors(List<Exception> errors) {
    // Lists cross several lifecycle boundaries. Preserve each exception object
    // once, including pre-existing startup failures, without message-based merging.
    lock(recoverySync) foreach(var error in errors) RecordTeardownError(error);
  }
  void RecordTeardownError(Exception error) {
    lock(recoverySync) if(recordedTeardownErrors.Add(error)) teardownHistory.Add(error);
  }
  public string[] TeardownFailures { get { lock(recoverySync) return teardownHistory.ConvertAll(error=>error.ToString()).ToArray(); } }
  public bool DeferredTeardownConfirmed { get { lock(recoverySync) return deferredConfirmed; } }
  void FinalizeDeferredDisposal(List<Exception> errors) {
    int first=errors.Count;
    var clock=Stopwatch.StartNew();
    try {
      lock(recoverySync) {
        if(HasActiveStartup()) throw new InvalidOperationException("Deferred cleanup requires settled startup");
        if(disposalComplete) return;
      }
      if(injectDeferredProofFailure!=null) injectDeferredProofFailure();
      if(handle==null || handle.IsClosed || handle.IsInvalid) throw new InvalidOperationException("Deferred job ownership unavailable; cannot certify exit");
      if(!TerminateJobObject(handle,1)) errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Terminate deferred job"));
      RecoverChildren(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
      ConfirmAssignedChildren(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
      CloseTelemetryIdentities(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
      bool empty=false;
      do {
        if(Pids().Length==0) { empty=true; break; }
        int remaining=(int)Math.Max(0,1000-clock.ElapsedMilliseconds);
        if(remaining==0) break;
        Thread.Sleep(Math.Min(10,remaining));
      } while(clock.ElapsedMilliseconds<1000);
      if(!empty) errors.Add(new TimeoutException("Deferred Job Object exit unconfirmed"));
      // Keep the job/recovery owner if any current proof or cleanup failed.
      if(empty && errors.Count==first) {
        handle.Dispose();
        if(handle.CloseError!=0) errors.Add(new Win32Exception(handle.CloseError,"Close deferred job"));
        if(errors.Count==first) lock(recoverySync) { disposalComplete=true; deferredConfirmed=true; }
      }
    } catch(Exception error) { errors.Add(error); }
    finally { RetainIfUnresolved(); }
  }
  void FinishTeardown(List<Exception> errors) {
    bool handoff;
    lock(recoverySync) {
      handoff=deferredDisposal && !automaticHandoffAttempted && !disposalComplete && !HasActiveStartup();
      if(handoff) automaticHandoffAttempted=true;
      else teardownBusy=false;
    }
    try { if(handoff) FinalizeDeferredDisposal(errors); }
    finally {
      if(handoff) lock(recoverySync) teardownBusy=false;
      RecordTeardownErrors(errors);
      RetainIfUnresolved();
    }
  }
  // One explicit bounded attempt for the owner/caller after a failed handoff.
  // No timer/thread schedules retries; prior failures remain inspectable.
  public void CompletePendingDisposal() {
    var errors=new List<Exception>();
    lock(recoverySync) {
      if(!disposeRequested) {
        var error=new InvalidOperationException("No disposal request to complete");
        RecordTeardownError(error); throw error;
      }
      if(HasActiveStartup()) errors.Add(new InvalidOperationException("Explicit completion requires settled startup; automatic handoff remains pending"));
    }
    if(errors.Count>0) {
      RecordTeardownErrors(errors);
      throw new GridTeardownException(this,"Explicit completion too early",errors);
    }
    if(!ClaimTeardown(true,errors)) {
      RecordTeardownErrors(errors); throw new GridTeardownException(this,"Deferred cleanup busy",errors);
    }
    try {
      lock(recoverySync) automaticHandoffAttempted=true;
      FinalizeDeferredDisposal(errors);
    } finally {
      RecordTeardownErrors(errors);
      FinishTeardown(errors);
    }
    if(errors.Count>0) throw new GridTeardownException(this,"Deferred cleanup failed; owner retained",errors);
  }
  bool BeginTeardown(List<Exception> errors) {
    lock(recoverySync) {
      stopping=true;
      foreach(var child in recovery) if(child.InProgress) {
        errors.Add(new InvalidOperationException("Teardown unconfirmed: process startup is still in progress"));
        return true;
      }
      return false;
    }
  }
  void RequireSettledStartup() {
    // Caller holds recoverySync, preventing admission during this check.
    foreach(var child in recovery) lock(child)
      if(child.InProgress || child.Process!=IntPtr.Zero || child.Thread!=IntPtr.Zero || (stopping && child.Confirmation!=IntPtr.Zero))
        throw new InvalidOperationException("Job inventory is not teardown proof: startup/recovery unresolved ("+child.State+")");
    if(stopping) RequireTelemetryOwners(true);
  }
  static bool ConfirmNativeExit(IntPtr process,uint timeout,List<Exception> errors) {
    uint state=WaitForSingleObject(process,timeout);
    if(state==0) return true;
    if(state==258) errors.Add(new TimeoutException("Native process exit unconfirmed (WAIT_TIMEOUT)"));
    else if(state==UInt32.MaxValue) errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Process wait failed (WAIT_FAILED)"));
    else errors.Add(new InvalidOperationException("Unexpected process wait result: "+state));
    return false;
  }
  static void TerminateAndConfirm(RecoveryChild child,uint timeout,List<Exception> errors) {
    lock(child) {
      if(child.Process==IntPtr.Zero) return;
      if(!TerminateProcess(child.Process,1)) errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Terminate process during recovery"));
      // Termination failure (including already-exited) never skips the exit wait.
      if(ConfirmNativeExit(child.Process,timeout,errors)) {
        if(CloseHandle(child.Process)) child.Process=IntPtr.Zero;
        else errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Close exited recovery process"));
      }
    }
  }
  void RecoverChildren(List<Exception> errors,uint budget=1000) {
    var clock=Stopwatch.StartNew(); RecoveryChild[] children;
    // In-progress startup owns its native handles until its finally completes.
    // Stop reports that unresolved state instead of racing to close its handles.
    lock(recoverySync) children=recovery.FindAll(child=>!child.InProgress).ToArray();
    foreach(var child in children) {
      TerminateAndConfirm(child,(uint)Math.Max(0,budget-clock.ElapsedMilliseconds),errors);
      CloseChildThread(child,errors);
    }
  }
  static void CloseChildThread(RecoveryChild child,List<Exception> errors) {
    lock(child) if(child.Thread!=IntPtr.Zero) {
      if(CloseHandle(child.Thread)) child.Thread=IntPtr.Zero;
      else errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Close retained child thread"));
    }
  }
  void ConfirmAssignedChildren(List<Exception> errors,uint budget) {
    var clock=Stopwatch.StartNew(); RecoveryChild[] children;
    lock(recoverySync) children=recovery.FindAll(child=>!child.InProgress).ToArray();
    foreach(var child in children) lock(child) if(child.Confirmation!=IntPtr.Zero) {
      if(ConfirmNativeExit(child.Confirmation,(uint)Math.Max(0,budget-clock.ElapsedMilliseconds),errors)) {
        if(CloseHandle(child.Confirmation)) child.Confirmation=IntPtr.Zero;
        else errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Close assigned-child confirmation handle"));
      }
    }
  }
  static void TransferChild(RecoveryChild child,List<Exception> errors) {
    lock(child) {
      // Caller has assigned the job AND acquired a retained managed handle.
      // The native handle changes role; keep it for independent exit proof even
      // if startup's managed Process wrapper is disposed by an error path.
      if(child.Process==IntPtr.Zero || child.Confirmation!=IntPtr.Zero) {
        errors.Add(new InvalidOperationException("Invalid assigned-child handle transfer")); return;
      }
      child.Confirmation=child.Process; child.Process=IntPtr.Zero;
      child.State=StartupState.Transferred;
    }
  }
  static void Check(bool ok) { if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  static void CleanupRetained(Process process,List<Exception> errors) {
    if(process==null) return;
    try { if(!process.HasExited) process.Kill(); } catch(Exception error) { errors.Add(error); }
    try { if(!process.WaitForExit(1000)) errors.Add(new InvalidOperationException("Retained process cleanup timeout")); }
    catch(Exception error) { errors.Add(error); }
    finally { try { process.Dispose(); } catch(Exception error) { errors.Add(error); } }
  }
  public GridJob() {
    handle = CreateJobObject(IntPtr.Zero, null); Check(!handle.IsInvalid);
    // Kill on handle close; disallow breakaway. Job committed-memory ceiling backs
    // up the sampled working-set guard (these are different memory measures).
    var limits = new EXT(); limits.basic.flags = 0x2000 | 0x200;
    limits.jobMemory = (UIntPtr)(2560UL * 1024 * 1024);
    try { Check(SetInformationJobObject(handle, 9, ref limits, (uint)Marshal.SizeOf(typeof(EXT)))); }
    catch(Exception original) { try { Dispose(); } catch(Exception cleanup) { throw new AggregateException(original,cleanup); } throw; }
  }
  public Process StartTracked(string executable, string arguments, string cwd) {
    return StartTrackedCore(executable,arguments,cwd,null);
  }
  Process StartTrackedCore(string executable,string arguments,string cwd,Action injectCreationFailure) {
    Process tracked = null; var errors=new List<Exception>(); bool managedCleanupAttempted=false;
    var child=ReserveChild();
    try {
    try {
      CheckStartupAdmission();
      var start = new START(); start.cb = (uint)Marshal.SizeOf(typeof(START)); INFO info;
      if(injectCreationFailure!=null) injectCreationFailure(); // Private deterministic fixture seam; no native child created.
      Check(CreateProcess(executable, new StringBuilder("\"" + executable + "\" " + arguments), IntPtr.Zero, IntPtr.Zero, false,
        0x4 | 0x08000000, IntPtr.Zero, cwd, ref start, out info));
      lock(child) { child.Process=info.process; child.Thread=info.thread; child.State=StartupState.Created; }
      CheckStartupAdmission();
      if (!AssignProcessToJobObject(handle, info.process)) {
        throw new Win32Exception(Marshal.GetLastWin32Error(), "AssignProcessToJobObject");
      }
      lock(child) child.State=StartupState.Assigned;
      tracked = Process.GetProcessById((int)info.pid);
      var retainedHandle = tracked.Handle;
      CheckStartupAdmission();
      if (ResumeThread(info.thread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread");
      TransferChild(child,errors);
    } catch (Exception original) {
      errors.Add(original);
    } finally {
      CloseChildThread(child,errors);
    }
    if(errors.Count>0) {
      TerminateAndConfirm(child,1000,errors);
      CleanupRetained(tracked,errors);
      managedCleanupAttempted=true;
    }
    } finally { CompleteStartup(child,errors); }
    if(errors.Count>0 && !managedCleanupAttempted) CleanupRetained(tracked,errors);
    if(errors.Count>0) {
      RecordTeardownErrors(errors); // Includes managed cleanup failures after CompleteStartup.
      throw new GridTeardownException(this,"Process startup/cleanup failed; see retained ownership and teardown history",errors);
    }
    return tracked;
  }
  static void ExpectLifecycleRejection(Action action,string message) {
    bool rejected=false;
    try { action(); } catch(InvalidOperationException) { rejected=true; }
    if(!rejected) throw new InvalidOperationException(message);
  }
  static void ExpectHistoryOnce(GridJob job,Exception expected,string message) {
    int count=0;
    lock(job.recoverySync) foreach(var error in job.teardownHistory)
      if(Object.ReferenceEquals(error,expected)) count++;
    if(count!=1 || Array.IndexOf(job.TeardownFailures,expected.ToString())<0)
      throw new InvalidOperationException(message);
  }
  internal static void StartupLifecycleRegression() {
    using(var job=new GridJob()) {
      var original=new Win32Exception(2,"Injected CreateProcess failure"); bool preserved=false;
      try { job.StartTrackedCore("not-executed","","",()=> { throw original; }); }
      catch(AggregateException error) { foreach(var inner in error.Flatten().InnerExceptions) preserved|=Object.ReferenceEquals(inner,original); }
      if(!preserved || job.recovery[0].InProgress || job.recovery[0].State!=StartupState.CreationFailed)
        throw new InvalidOperationException("Creation failure left startup active or lost original error");
      ExpectHistoryOnce(job,original,"Original creation failure absent/duplicated in historical ledger");
      var child=job.ReserveChild();
      ExpectLifecycleRejection(()=>job.Pids(),"Empty inventory certified active creation");
      job.CompleteStartup(child);
      var transfer=job.ReserveChild(); transfer.State=StartupState.Transferred; job.CompleteStartup(transfer);
      if(transfer.InProgress || transfer.State!=StartupState.Transferred) throw new InvalidOperationException("Transfer lifecycle lost");
      var failedAssignment=job.ReserveChild();
      // Synthetic ownership marker; cleared before any native cleanup API sees it.
      try {
        failedAssignment.State=StartupState.Created; failedAssignment.Process=new IntPtr(1); job.CompleteStartup(failedAssignment);
        if(failedAssignment.State!=StartupState.Unresolved) throw new InvalidOperationException("Unresolved assignment lost ownership state");
        ExpectLifecycleRejection(()=>job.Pids(),"Empty inventory certified unresolved assignment");
      } finally { failedAssignment.Process=IntPtr.Zero; job.CompleteStartup(failedAssignment); }
    }
    var interleaved=new GridJob(); RecoveryChild active=null;
    try {
      active=interleaved.ReserveChild(); bool stopRejected=false,disposeRejected=false;
      try { interleaved.Stop(); } catch(AggregateException) { stopRejected=true; }
      try { interleaved.Dispose(); } catch(AggregateException) { disposeRejected=true; }
      if(!stopRejected || !disposeRejected || interleaved.handle.IsClosed)
        throw new InvalidOperationException("Teardown silently accepted or closed job during active startup");
      ExpectLifecycleRejection(()=>interleaved.ReserveChild(),"Startup admitted after Stop/Dispose");
      ExpectLifecycleRejection(()=>interleaved.Pids(),"Inventory certified interrupted startup");
    } finally {
      if(active!=null) interleaved.CompleteStartup(active);
      if(!interleaved.DeferredTeardownConfirmed || !interleaved.handle.IsClosed || interleaved.TeardownFailures.Length==0)
        throw new InvalidOperationException("Last-startup cleanup handoff did not confirm release or preserve prior failure");
      interleaved.Dispose();
    }
    DeferredDisposalRegression();
  }
  static void DeferredDisposalRegression() {
    var multiple=new GridJob(); var firstStartup=multiple.ReserveChild(); var lastStartup=multiple.ReserveChild();
    try {
      bool rejected=false;
      try { multiple.Dispose(); } catch(AggregateException) { rejected=true; }
      bool earlyRejected=false;
      try { multiple.CompletePendingDisposal(); } catch(GridTeardownException) { earlyRejected=true; }
      if(!earlyRejected || multiple.automaticHandoffAttempted) throw new InvalidOperationException("Early explicit call consumed the pending handoff");
      var earlyFailure=new Win32Exception(5,"Original failure before the last startup settles");
      multiple.CompleteStartup(firstStartup,new List<Exception>{earlyFailure});
      ExpectHistoryOnce(multiple,earlyFailure,"Startup without handoff lost its original failure");
      if(!rejected || multiple.handle.IsClosed || multiple.DeferredTeardownConfirmed)
        throw new InvalidOperationException("Cleanup ran before all registered startups settled");
      multiple.CompleteStartup(lastStartup);
      if(!multiple.handle.IsClosed || !multiple.DeferredTeardownConfirmed)
        throw new InvalidOperationException("Last of multiple startups did not complete disposal");
      ExpectHistoryOnce(multiple,earlyFailure,"Later successful handoff erased an earlier startup failure");
    } finally {
      if(firstStartup.InProgress) multiple.CompleteStartup(firstStartup,new List<Exception>());
      if(lastStartup.InProgress) multiple.CompleteStartup(lastStartup,new List<Exception>());
      multiple.Dispose();
    }
    // Deterministic schedule: a teardown caller owns the gate while the last
    // startup completes. No worker thread or native child process is needed.
    var busy=new GridJob(); var pending=busy.ReserveChild();
    var ownerErrors=new List<Exception>();
    var original=new InvalidOperationException("Synthetic owning caller failure"); ownerErrors.Add(original);
    if(!busy.ClaimTeardown(false,ownerErrors)) throw new InvalidOperationException("Cannot claim synthetic owner");
    try {
      bool rejected=false;
      try { busy.Dispose(); } catch(AggregateException) { rejected=true; }
      busy.CompleteStartup(pending);
      if(!rejected || busy.handle.IsClosed || busy.DeferredTeardownConfirmed)
        throw new InvalidOperationException("Concurrent disposal bypassed the active teardown owner");
      bool secondRejected=false;
      try { busy.Stop(); } catch(AggregateException) { secondRejected=true; }
      if(!secondRejected) throw new InvalidOperationException("Concurrent Stop claimed already-owned cleanup");
    } finally { busy.FinishTeardown(ownerErrors); }
    try {
      if(!busy.DeferredTeardownConfirmed || !busy.handle.IsClosed || !Object.ReferenceEquals(ownerErrors[0],original))
        throw new InvalidOperationException("Teardown-owner handoff lost release proof or original error");
      ExpectHistoryOnce(busy,original,"FinishTeardown omitted its pre-existing original error");
    } finally { busy.Dispose(); }

    var failed=new GridJob(); var settling=failed.ReserveChild();
    var primary=new Win32Exception(5,"Synthetic original startup failure");
    var completionErrors=new List<Exception>{primary};
    var proofFailure=new TimeoutException("Injected deferred exit proof timeout");
    try {
      bool ownerExposed=false;
      try { failed.Dispose(); } catch(GridTeardownException error) { ownerExposed=Object.ReferenceEquals(error.CleanupOwner,failed); }
      if(!ownerExposed) throw new InvalidOperationException("Interrupted disposal did not return an actionable cleanup owner");
      failed.injectDeferredProofFailure=()=> { throw proofFailure; };
      failed.CompleteStartup(settling,completionErrors);
      if(failed.DeferredTeardownConfirmed || failed.handle.IsClosed || !failed.automaticHandoffAttempted ||
        !completionErrors.Contains(primary) || !completionErrors.Contains(proofFailure))
        throw new InvalidOperationException("Failed automatic handoff released ownership or lost errors");
      ExpectHistoryOnce(failed,primary,"CompleteStartup original absent/duplicated after failed handoff");
      ExpectHistoryOnce(failed,proofFailure,"Secondary proof failure absent/duplicated after failed handoff");
      lock(unresolvedOwners) if(!unresolvedOwners.Contains(failed)) throw new InvalidOperationException("Failed handoff owner was abandoned");
      failed.CompleteStartup(settling,completionErrors);
      if(completionErrors.Count!=2 || failed.DeferredTeardownConfirmed || failed.handle.IsClosed)
        throw new InvalidOperationException("Failed automatic handoff retried without an explicit owner call");
      failed.injectDeferredProofFailure=null;
      failed.CompletePendingDisposal(); // Exactly one explicit later attempt.
      if(!failed.DeferredTeardownConfirmed || !failed.handle.IsClosed || failed.TeardownFailures.Length<2)
        throw new InvalidOperationException("Explicit completion lost proof or historical failures");
      ExpectHistoryOnce(failed,primary,"Original startup failure lost after successful deferred cleanup");
      ExpectHistoryOnce(failed,proofFailure,"Secondary failure lost after successful deferred cleanup");
      lock(unresolvedOwners) if(unresolvedOwners.Contains(failed)) throw new InvalidOperationException("Confirmed owner remained rooted");
      failed.CompletePendingDisposal(); // Completed state must be idempotent.
      ExpectHistoryOnce(failed,primary,"Idempotent completion duplicated an earlier failure");
      var separateFailure=new Win32Exception(5,"Synthetic original startup failure");
      int before=failed.TeardownFailures.Length;
      var repeated=new List<Exception>{primary,proofFailure,primary,separateFailure};
      failed.RecordTeardownErrors(repeated);
      failed.FinishTeardown(repeated);
      failed.CompleteStartup(settling,repeated);
      if(failed.TeardownFailures.Length!=before+1 || !failed.DeferredTeardownConfirmed)
        throw new InvalidOperationException("Historical dedup changed cleanup proof or merged distinct exceptions");
      ExpectHistoryOnce(failed,primary,"Repeated lifecycle recording duplicated original identity");
      ExpectHistoryOnce(failed,proofFailure,"Repeated lifecycle recording duplicated secondary identity");
      ExpectHistoryOnce(failed,separateFailure,"Distinct exception with matching text was merged");
    } finally {
      failed.injectDeferredProofFailure=null;
      if(settling.InProgress) failed.CompleteStartup(settling,new List<Exception>());
      failed.Dispose();
    }
  }
  internal static void LiveTelemetryRegression() {
    using(var job=new GridJob()) {
      var active=job.ReserveChild();
      try {
        if(GridSafety.Observe(job).CoverageComplete) throw new InvalidOperationException("Active startup reported complete live coverage");
        ExpectLifecycleRejection(()=>job.Pids(),"Monitoring relaxed strict startup certification");
        if(GridSafety.ObserveCore(job,()=>job.CompleteStartup(active)).CoverageComplete)
          throw new InvalidOperationException("Startup settling during a sample erased incomplete initial coverage");
      } finally { job.CompleteStartup(active); }
      if(!GridSafety.Observe(job).CoverageComplete) throw new InvalidOperationException("Settled startup did not restore coverage");
      // Startup both begins and ends inside a sample: generation still invalidates it.
      var changed=GridSafety.ObserveCore(job,()=> { var child=job.ReserveChild(); job.CompleteStartup(child); });
      if(changed.CoverageComplete) throw new InvalidOperationException("Stale live generation accepted");
      var original=new Win32Exception(5,"Injected real telemetry failure type"); bool propagated=false;
      try { GridSafety.ObserveCore(job,()=> { throw original; }); }
      catch(Win32Exception error) { propagated=Object.ReferenceEquals(error,original); }
      if(!propagated) throw new InvalidOperationException("Telemetry exception swallowed");
      var unresolved=job.ReserveChild();
      try {
        unresolved.Process=new IntPtr(1); job.CompleteStartup(unresolved);
        ExpectLifecycleRejection(()=>GridSafety.Observe(job),"Unresolved native ownership accepted as startup grace");
        ExpectLifecycleRejection(()=>job.Pids(),"Unresolved native ownership certified teardown");
      } finally { unresolved.Process=IntPtr.Zero; job.CompleteStartup(unresolved); }
      var interrupted=job.ReserveChild();
      try {
        bool rejected=false;
        try { job.Stop(); } catch(GridTeardownException) { rejected=true; }
        if(!rejected || GridSafety.Observe(job).CoverageComplete) throw new InvalidOperationException("Stop/startup interaction hid unresolved coverage");
        ExpectLifecycleRejection(()=>job.Pids(),"Concurrent stop certified active startup");
      } finally { job.CompleteStartup(interrupted); }
      if(job.Pids().Length!=0 || !GridSafety.Observe(job).CoverageComplete) throw new InvalidOperationException("Settled stopped job did not retain strict empty proof");
    }
  }
  public int Start(string executable, string arguments, string cwd) {
    using (var process = StartTracked(executable, arguments, cwd)) return process.Id;
  }
  public void VerifyLimits() {
    EXT limits; uint returned;
    Check(QueryInformationJobObject(handle, 9, out limits, (uint)Marshal.SizeOf(typeof(EXT)), out returned));
    if ((limits.basic.flags & 0x2200) != 0x2200 || (limits.basic.flags & 0x1800) != 0 || limits.jobMemory.ToUInt64() != 2560UL*1024*1024)
      throw new InvalidOperationException("Unexpected job limits/breakaway flags");
  }
  public int[] Pids() {
    long generation;
    lock(recoverySync) { RequireSettledStartup(); generation=startupGeneration; }
    var pids=QueryLivePids();
    lock(recoverySync) {
      RequireSettledStartup();
      if(generation!=startupGeneration) throw new InvalidOperationException("Startup changed during Job Object inventory");
    }
    return pids;
  }
  // Monitoring is never teardown proof. Active creation can own a suspended,
  // not-yet-assigned process; callers must bound this explicitly incomplete state.
  internal bool LiveCoverageComplete(long generation) {
    lock(recoverySync) {
      RequireTelemetryOwners(false);
      foreach(var child in recovery) lock(child)
        if(!child.InProgress && (child.Process!=IntPtr.Zero || child.Thread!=IntPtr.Zero))
          throw new InvalidOperationException("Live telemetry blocked by unresolved recovery ownership");
      return generation==startupGeneration && !HasActiveStartup();
    }
  }
  internal long LiveGeneration { get { lock(recoverySync) return startupGeneration; } }
  internal int[] QueryLivePids() {
    const int size = 65536; IntPtr buffer = Marshal.AllocHGlobal(size);
    try {
      uint returned; Check(QueryInformationJobObject(handle, 3, buffer, size, out returned));
      int count = Marshal.ReadInt32(buffer, 4);
      int assigned=Marshal.ReadInt32(buffer,0);
      if(count<0 || assigned<0 || assigned!=count || count>(size-8)/IntPtr.Size)
        throw new InvalidOperationException("Incomplete or invalid process inventory");
      int[] pids = new int[count];
      for (int i=0; i<count; i++) pids[i] = Marshal.ReadIntPtr(buffer, 8+i*IntPtr.Size).ToInt32();
      return pids;
    } finally { Marshal.FreeHGlobal(buffer); }
  }
  public static MEMORY Memory() { var m = new MEMORY(); m.length=(uint)Marshal.SizeOf(typeof(MEMORY)); Check(GlobalMemoryStatusEx(ref m)); return m; }
  public void Stop() {
    var errors=new List<Exception>();
    if(!ClaimTeardown(false,errors)) { RecordTeardownErrors(errors); throw new GridTeardownException(this,"Stop not confirmed",errors); }
    try {
      BeginTeardown(errors);
      var clock=Stopwatch.StartNew();
      if(handle!=null && !handle.IsClosed && !handle.IsInvalid && !TerminateJobObject(handle,1)) errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Terminate job"));
      RecoverChildren(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
      ConfirmAssignedChildren(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
    } catch(Exception error) { errors.Add(error); }
    finally { RecordTeardownErrors(errors); FinishTeardown(errors); }
    if(errors.Count>0) throw new GridTeardownException(this,"Job/recovery termination failed",errors);
  }
  public void Dispose() {
    var errors=new List<Exception>();
    if(!ClaimTeardown(true,errors)) { RecordTeardownErrors(errors); throw new GridTeardownException(this,"Disposal not confirmed",errors); }
    try {
      bool active=BeginTeardown(errors);
      bool deferred; lock(recoverySync) deferred=deferredDisposal;
      if(deferred && !active) {
        bool attempted; lock(recoverySync) attempted=automaticHandoffAttempted;
        if(attempted) FinalizeDeferredDisposal(errors); // Explicit later Dispose, one bounded attempt.
      } else if(!deferred) {
        var clock=Stopwatch.StartNew();
        RecoverChildren(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
        // Preserve ordinary kill-on-close semantics; external retained-handle
        // assertions, not this method alone, still establish normal tree exit.
        if(!active && handle!=null) { handle.Dispose(); if(handle.CloseError!=0) errors.Add(new Win32Exception(handle.CloseError,"Close job handle")); }
        ConfirmAssignedChildren(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
        if(!active) CloseTelemetryIdentities(errors,(uint)Math.Max(0,1000-clock.ElapsedMilliseconds));
        bool unresolved=active;
        unresolved|=HasTelemetryOwnership;
        lock(recoverySync) {
          foreach(var child in recovery) lock(child) unresolved|=child.InProgress || child.Process!=IntPtr.Zero || child.Thread!=IntPtr.Zero || child.Confirmation!=IntPtr.Zero;
          if(!unresolved && handle!=null && handle.IsClosed && handle.CloseError==0) disposalComplete=true;
        }
        if(unresolved) errors.Add(new InvalidOperationException("Teardown unconfirmed; recovery handles remain owned"));
      }
    } catch(Exception error) { errors.Add(error); }
    finally { RecordTeardownErrors(errors); FinishTeardown(errors); }
    if(errors.Count>0) throw new GridTeardownException(this,"Job disposal failed",errors);
  }
}
