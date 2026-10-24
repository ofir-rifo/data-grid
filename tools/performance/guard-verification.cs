using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

// Separate read-only process identity ownership; never used for termination.
public sealed class GridTelemetryHandle : SafeHandleZeroOrMinusOneIsInvalid {
  public int CloseError;
  public bool CloseConfirmed;
  public GridTelemetryHandle():base(true) {}
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr value);
  protected override bool ReleaseHandle() { bool ok=CloseHandle(handle); if(!ok) CloseError=Marshal.GetLastWin32Error(); CloseConfirmed=ok; return ok; }
}

public sealed partial class GridJob {
  internal sealed class TelemetryIdentity {
    internal readonly GridJob Owner;
    internal readonly int Pid;
    internal GridTelemetryHandle Process;
    internal long Created;
    internal bool Validated;
    internal uint? LastWait;
    internal int LastWaitError;
    internal DateTime? LastWaitUtc;
    internal TelemetryIdentity(GridJob owner,int pid) { Owner=owner; Pid=pid; }
  }
  readonly object telemetrySync=new object();
  readonly Dictionary<int,TelemetryIdentity> telemetryIdentities=new Dictionary<int,TelemetryIdentity>();
  bool telemetryClosing;
  [DllImport("kernel32.dll",EntryPoint="OpenProcess",SetLastError=true)]
  static extern GridTelemetryHandle OpenTelemetryProcess(uint access,bool inherit,int pid);
  [DllImport("kernel32.dll",EntryPoint="IsProcessInJob",SetLastError=true)]
  static extern bool TelemetryProcessInJob(GridTelemetryHandle process,GridJobHandle job,out bool member);
  [DllImport("kernel32.dll",EntryPoint="WaitForSingleObject",SetLastError=true)]
  static extern uint TelemetryExitState(GridTelemetryHandle process,uint milliseconds);
  [DllImport("kernel32.dll",EntryPoint="GetProcessId",SetLastError=true)]
  static extern uint TelemetryProcessId(IntPtr process);
  [DllImport("kernel32.dll",EntryPoint="GetProcessTimes",SetLastError=true)]
  static extern bool TelemetryProcessTimes(IntPtr process,out long created,out long exited,out long kernel,out long user);
  internal static bool DecodeTelemetryWait(uint state,int nativeError) {
    if(state==0) return true;
    if(state==258) return false;
    if(state==UInt32.MaxValue) throw new System.ComponentModel.Win32Exception(nativeError,"Retained telemetry process wait failed (WAIT_FAILED)");
    throw new InvalidOperationException("Unexpected retained telemetry wait state: "+state);
  }
  internal static bool RetainedExitProof(bool owned,bool sameIdentity,Func<uint> wait,Func<int> nativeError) {
    if(!owned || !sameIdentity) throw new InvalidOperationException("Missing or mismatched retained telemetry identity");
    uint state=wait(); int error=state==UInt32.MaxValue?nativeError():0;
    return DecodeTelemetryWait(state,error);
  }
  internal static void CheckTelemetryIdentity(int expectedPid,long expectedCreated,uint actualPid,long actualCreated) {
    if(expectedPid<=0 || expectedCreated<=0 || actualPid!=(uint)expectedPid || actualCreated!=expectedCreated)
      throw new InvalidOperationException("Telemetry PID/creation-time identity mismatch");
  }
  internal static void RequireTelemetryClose(bool confirmed,int nativeError,int pid) {
    if(confirmed && nativeError==0) return;
    if(nativeError!=0) throw new System.ComponentModel.Win32Exception(nativeError,"Close retained telemetry identity: "+pid);
    throw new InvalidOperationException("Native telemetry handle close unconfirmed: "+pid);
  }
  static long TelemetryCreation(IntPtr process) {
    long created,exited,kernel,user;
    if(!TelemetryProcessTimes(process,out created,out exited,out kernel,out user))
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"GetProcessTimes for telemetry identity");
    return created;
  }
  static uint TelemetryPid(IntPtr process) {
    uint pid=TelemetryProcessId(process);
    if(pid==0) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"GetProcessId for telemetry identity");
    return pid;
  }
  static uint RecordTelemetryWait(TelemetryIdentity identity,uint milliseconds) {
    uint state=TelemetryExitState(identity.Process,milliseconds);
    int error=state==UInt32.MaxValue?Marshal.GetLastWin32Error():0;
    identity.LastWait=state; identity.LastWaitError=error; identity.LastWaitUtc=DateTime.UtcNow;
    return state;
  }
  internal TelemetryIdentity RetainTelemetryIdentity(int pid) {
    lock(telemetrySync) {
      if(telemetryClosing) throw new InvalidOperationException("Telemetry identity owner is closing");
      TelemetryIdentity identity;
      if(telemetryIdentities.TryGetValue(pid,out identity)) {
        if(!identity.Validated) throw new InvalidOperationException("Earlier telemetry identity acquisition unresolved: "+pid);
        return identity;
      }
      // Register ownership BEFORE opening. Failed acquisitions remain owned until
      // Dispose; an unvalidated candidate is never treated as an owned child.
      identity=new TelemetryIdentity(this,pid); telemetryIdentities.Add(pid,identity);
      identity.Process=OpenTelemetryProcess(0x1000|0x100000,false,pid);
      if(identity.Process.IsInvalid) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Cannot retain telemetry identity: "+pid);
      identity.Created=TelemetryCreation(identity.Process.DangerousGetHandle());
      CheckTelemetryIdentity(pid,identity.Created,TelemetryPid(identity.Process.DangerousGetHandle()),identity.Created);
      if(DecodeTelemetryWait(RecordTelemetryWait(identity,0),identity.LastWaitError))
        throw new InvalidOperationException("Process exited before telemetry ownership was established: "+pid);
      bool member;
      if(!TelemetryProcessInJob(identity.Process,handle,out member))
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Cannot establish telemetry job membership: "+pid);
      if(!member) throw new InvalidOperationException("Telemetry identity was not established as a job member: "+pid);
      identity.Validated=true; return identity;
    }
  }
  void RequireTelemetryIdentity(TelemetryIdentity identity) {
    TelemetryIdentity retained;
    if(telemetryClosing || identity==null || !Object.ReferenceEquals(identity.Owner,this) || !identity.Validated ||
      !telemetryIdentities.TryGetValue(identity.Pid,out retained) || !Object.ReferenceEquals(identity,retained) ||
      identity.Process==null || identity.Process.IsClosed || identity.Process.IsInvalid)
      throw new InvalidOperationException("Retained telemetry identity unavailable; no PID fallback");
  }
  internal void VerifyTelemetryIdentity(TelemetryIdentity identity,Process observed) {
    lock(telemetrySync) {
      RequireTelemetryIdentity(identity);
      var observedHandle=observed.Handle;
      CheckTelemetryIdentity(identity.Pid,identity.Created,TelemetryPid(observedHandle),TelemetryCreation(observedHandle));
    }
  }
  internal bool ConfirmTelemetryExit(TelemetryIdentity identity) {
    lock(telemetrySync) {
      RequireTelemetryIdentity(identity);
      // No OpenProcess or IsProcessInJob here: established identity survives exit.
      return RetainedExitProof(true,true,()=>RecordTelemetryWait(identity,0),()=>identity.LastWaitError);
    }
  }
  bool HasTelemetryOwnership { get { lock(telemetrySync) return telemetryIdentities.Count!=0; } }
  void RequireTelemetryOwners(bool teardown) {
    lock(telemetrySync) foreach(var identity in telemetryIdentities.Values) {
      if(!identity.Validated || identity.Process==null || identity.Process.IsClosed || identity.Process.IsInvalid)
        throw new InvalidOperationException("Unresolved retained telemetry ownership: "+identity.Pid);
      if(teardown && !DecodeTelemetryWait(RecordTelemetryWait(identity,0),identity.LastWaitError))
        throw new InvalidOperationException("Retained telemetry process still live during teardown: "+identity.Pid);
    }
  }
  void CloseTelemetryIdentities(List<Exception> errors,uint budget) {
    var clock=Stopwatch.StartNew();
    lock(telemetrySync) {
      telemetryClosing=true;
      var released=new List<int>();
      foreach(var entry in telemetryIdentities) {
        var identity=entry.Value;
        try {
          if(identity.Process!=null && !identity.Process.IsInvalid) {
            if(identity.Validated && !identity.Process.IsClosed &&
              !DecodeTelemetryWait(RecordTelemetryWait(identity,(uint)Math.Max(0,budget-clock.ElapsedMilliseconds)),identity.LastWaitError)) {
              errors.Add(new TimeoutException("Retained telemetry exit unconfirmed: "+identity.Pid)); continue;
            }
            identity.Process.Dispose();
            RequireTelemetryClose(identity.Process.CloseConfirmed,identity.Process.CloseError,identity.Pid);
          } else if(identity.Process!=null) identity.Process.Dispose();
          released.Add(entry.Key);
        } catch(Exception error) { errors.Add(error); }
      }
      foreach(var pid in released) telemetryIdentities.Remove(pid);
    }
  }
  internal object[] TelemetrySnapshot() {
    lock(telemetrySync) return telemetryIdentities.Values.Select(identity=>(object)new {
      pid=identity.Pid,createdFileTime=identity.Created,ownershipEstablished=identity.Validated,
      handleClosed=identity.Process==null?(bool?)null:identity.Process.IsClosed,
      closeError=identity.Process==null?(int?)null:identity.Process.CloseError,
      closeConfirmed=identity.Process==null?(bool?)null:identity.Process.CloseConfirmed,
      lastWait=identity.LastWait,lastWaitError=identity.LastWaitError,lastWaitUtc=identity.LastWaitUtc
    }).ToArray();
  }
}

// Test-only enforcement. Disk IO has its own thread; the watchdog never waits on it.
public sealed class GridEvidence : IDisposable {
  sealed class Item { public string Text; public ManualResetEventSlim Ack = new ManualResetEventSlim(); }
  readonly BlockingCollection<Item> queue = new BlockingCollection<Item>(128);
  readonly Thread writer;
  public volatile string Failure;
  public GridEvidence(string path, bool injectFailure=false) {
    writer=new Thread(()=> {
      try {
        using(var file=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.Read)) {
          foreach(var item in queue.GetConsumingEnumerable()) {
            if(injectFailure) throw new IOException("Injected evidence-write failure");
            var bytes=System.Text.Encoding.UTF8.GetBytes(item.Text+"\n"); file.Write(bytes,0,bytes.Length); file.Flush(true); item.Ack.Set();
          }
        }
      } catch(Exception error) { Failure=error.ToString(); Console.Error.WriteLine("Independent evidence failure: "+error.Message); }
    }); writer.IsBackground=true; writer.Start();
  }
  public void Write(object value) {
    if(Failure!=null) throw new IOException(Failure);
    var item=new Item {Text=JsonSerializer.Serialize(new {utc=DateTime.UtcNow,value})};
    if(!queue.TryAdd(item) || !item.Ack.Wait(300) || Failure!=null) throw new IOException("Evidence queue/flush failure: "+Failure);
  }
  public void Dispose() { queue.CompleteAdding(); if(!writer.Join(500)) throw new IOException("Evidence writer shutdown timeout"); }
}

public static class GridSafety {
  internal static bool ExpectedLookupExit(Exception error,bool lookupFailed,Func<bool> confirmRetainedExit) {
    // Only GetProcessById disappearance can take this recovery path. Access denial,
    // memory/name read failures and unconfirmed exits retain fail-closed behavior.
    return lookupFailed && error is ArgumentException && confirmRetainedExit();
  }
  static bool ConfirmLookupExit(GridJob job,GridJob.TelemetryIdentity identity,Process process,Exception original) {
    try { return ExpectedLookupExit(original,process==null,()=>job.ConfirmTelemetryExit(identity)); }
    catch(Exception confirmation) { throw new AggregateException("Telemetry disappearance could not be independently confirmed: "+identity.Pid,original,confirmation); }
  }
  public sealed class Sample {
    public long Available=8L<<30, Total=16L<<30, Browser, Owned, Growth, Unsettled, Supervisor;
    public bool Telemetry=true, Evidence=true, Phase=true, Fresh=true;
    public bool CoverageComplete=true;
  }
  // A partial sample is not healthy monitoring coverage. Keep sampling members
  // and enforcing all limits, but permit at most 100ms before failing closed.
  internal sealed class CoverageBudget {
    long? incompleteSince;
    public string Evaluate(Sample sample,long elapsed) {
      string violation=Violation(sample);
      if(violation!=null) return violation;
      if(incompleteSince.HasValue && elapsed-incompleteSince.Value>=100) return "startup-telemetry-incomplete";
      if(sample.CoverageComplete) { incompleteSince=null; return null; }
      if(!incompleteSince.HasValue) incompleteSince=elapsed;
      return null;
    }
  }
  public static string Violation(Sample s) {
    if(!s.Telemetry) return "missing-live-process-telemetry";
    if(!s.Evidence) return "evidence-failure";
    if(!s.Phase || !s.Fresh) return "invalid-or-stale-phase";
    if(s.Available<Math.Max(4L<<30,s.Total/4)) return "available-RAM";
    if(s.Browser>1536L*1024*1024) return "browser-working-set";
    if(s.Owned>2560L*1024*1024) return "owned-working-set";
    if(s.Growth>256L*1024*1024) return "growth";
    if(s.Unsettled>128L*1024*1024) return "settlement";
    return null;
  }
  // Every live owned PID must be inspectable. Exits are accepted only when a
  // retained process handle confirms exit; access denied is never silently skipped.
  public static long WorkingSet(GridJob job) {
    var sample=Observe(job);
    if(!sample.CoverageComplete) throw new InvalidOperationException("Working-set diagnostic requires complete live coverage");
    return sample.Owned-sample.Supervisor;
  }
  public static Sample Observe(GridJob job) {
    return ObserveCore(job,null);
  }
  internal static Sample ObserveCore(GridJob job,Action afterMembers) {
    var memory=GridJob.Memory(); var sample=new Sample{Available=(long)memory.available,Total=(long)memory.total};
    long generation=job.LiveGeneration;
    // Check unresolved owners before reading members as well as after sampling.
    bool initiallyComplete=job.LiveCoverageComplete(generation);
    foreach(var pid in job.QueryLivePids()) {
      var identity=job.RetainTelemetryIdentity(pid);
      Process process=null;
      try {
        process=Process.GetProcessById(pid); var h=process.Handle; process.Refresh();
        job.VerifyTelemetryIdentity(identity,process);
        if(job.ConfirmTelemetryExit(identity)) continue;
        sample.Owned+=process.WorkingSet64;
        if(new[]{"chrome","chromium","headless_shell","chrome_crashpad_handler"}.Contains(process.ProcessName)) sample.Browser+=process.WorkingSet64;
      } catch(Exception error) {
        if(ConfirmLookupExit(job,identity,process,error)) continue;
        throw new InvalidOperationException("Missing live owned-process telemetry: "+pid,error);
      } finally { if(process!=null) process.Dispose(); }
    }
    using(var supervisor=Process.GetCurrentProcess()) sample.Supervisor=supervisor.WorkingSet64;
    sample.Owned+=sample.Supervisor;
    if(afterMembers!=null) afterMembers(); // Deterministic schedule/error fixture only.
    bool finallyComplete=job.LiveCoverageComplete(generation);
    sample.CoverageComplete=initiallyComplete && finallyComplete;
    return sample;
  }
}

public sealed class GridAbortRecord {
  readonly object sync=new object();
  string first;
  readonly List<string> cleanup=new List<string>();
  public string Reason { get { lock(sync) return first; } }
  public string[] CleanupErrors { get { lock(sync) return cleanup.ToArray(); } }
  public void Observe(string candidate) { lock(sync) { if(first==null && candidate!=null) first=candidate; } }
  public void RecordCleanup(Exception error) { lock(sync) cleanup.Add(error.ToString()); }
}

// Monotonic independent watchdog: no control files, worker timestamps or disk IO.
public sealed class GridGuard : IDisposable {
  readonly GridJob job;
  readonly Stopwatch clock=Stopwatch.StartNew();
  readonly Thread watchdog;
  readonly object sync=new object();
  readonly int limit;
  readonly GridSafety.CoverageBudget coverage=new GridSafety.CoverageBudget();
  long sampleCount,incompleteCount,peakOwned,minimumAvailable=Int64.MaxValue;
  bool stopped;
  public readonly GridAbortRecord Abort=new GridAbortRecord();
  public string Reason { get { return Abort.Reason; } }
  public GridGuard(GridJob owned,int milliseconds) {
    job=owned; limit=milliseconds;
    watchdog=new Thread(()=> {
      while(true) {
        lock(sync) {
          if(stopped) return;
          try {
            // Failure is terminal: a later healthy/empty-job sample must never
            // erase the first abort reason (the single verification run caught this).
            if(Reason==null) {
              if(clock.ElapsedMilliseconds>=limit) Abort.Observe("monotonic-watchdog-timeout");
              else {
                var sample=GridSafety.Observe(job);
                sampleCount++; if(!sample.CoverageComplete) incompleteCount++;
                peakOwned=Math.Max(peakOwned,sample.Owned); minimumAvailable=Math.Min(minimumAvailable,sample.Available);
                Abort.Observe(coverage.Evaluate(sample,clock.ElapsedMilliseconds));
              }
            }
            if(Reason!=null) { job.Stop(); return; }
          } catch(Exception error) {
            if(Reason==null) Abort.Observe("watchdog-failure: "+error);
            else { Abort.RecordCleanup(error); Console.Error.WriteLine("Secondary watchdog failure: "+error); }
            try { job.Stop(); } catch(Exception cleanup) { Abort.RecordCleanup(cleanup); Console.Error.WriteLine(cleanup); } return;
          }
        }
        Thread.Sleep(25);
      }
    }); watchdog.IsBackground=true; watchdog.Start();
  }
  public void Fail(string reason) {
    lock(sync) {
      Abort.Observe(reason);
      try { job.Stop(); } catch(Exception cleanup) { Abort.RecordCleanup(cleanup); throw new AggregateException(new Exception("Original abort: "+Reason),cleanup); }
    }
  }
  public object Snapshot() {
    lock(sync) return new {sampleCount,incompleteCount,peakOwnedBytes=peakOwned,
      minimumAvailableBytes=sampleCount==0?(long?)null:minimumAvailable,
      deadlineMs=limit,elapsedMs=clock.ElapsedMilliseconds,abortReason=Reason,cleanupErrors=Abort.CleanupErrors,
      retainedIdentities=job.TelemetrySnapshot()};
  }
  public void Dispose() {
    lock(sync) { stopped=true; }
    if(!watchdog.Join(500)) { var error=new Exception("Watchdog failed to stop"); Abort.RecordCleanup(error); Abort.Observe("watchdog-shutdown-timeout"); throw error; }
  }
}

public static class GridVerification {
  static void Check(bool ok,string message) { if(!ok) throw new InvalidOperationException(message); }
  static void RequireHealthyGuard(string reason) {
    Check(reason==null,"Unexpected independent guard abort: "+reason);
  }
  static void FinishHealthyGuard(GridGuard guard,GridEvidence evidence=null) {
    guard.Dispose();
    if(evidence!=null) evidence.Write(new {eventName="guard-observations",observations=guard.Snapshot()});
    RequireHealthyGuard(guard.Reason);
    Check(guard.Abort.CleanupErrors.Length==0,"Independent guard cleanup failed");
  }
  static void TelemetryExitRaceRegression() {
    var gone=new ArgumentException("Process with an Id is not running");
    Check(GridSafety.ExpectedLookupExit(gone,true,()=>true),"Confirmed owned exit race rejected");
    Check(!GridSafety.ExpectedLookupExit(gone,true,()=>false),"Unconfirmed/live/unrelated process disappearance accepted");
    Check(!GridSafety.ExpectedLookupExit(gone,false,()=> { throw new Exception("Confirmation must not run after successful lookup"); }),"Post-lookup failure accepted");
    Check(!GridSafety.ExpectedLookupExit(new System.ComponentModel.Win32Exception(5),true,()=> { throw new Exception("Access denied must not use exit recovery"); }),"Access denial swallowed");
    bool rejected=false;
    try { GridSafety.ExpectedLookupExit(gone,true,()=> { throw new System.ComponentModel.Win32Exception(5); }); }
    catch(System.ComponentModel.Win32Exception error) { rejected=error.NativeErrorCode==5; }
    Check(rejected,"Failed independent exit probe swallowed");
    var budget=new GridSafety.CoverageBudget();
    var pending=new GridSafety.Sample{CoverageComplete=false};
    Check(budget.Evaluate(pending,10)==null,"Ordinary startup immediately aborted");
    Check(budget.Evaluate(pending,109)==null,"Startup coverage deadline shortened unexpectedly");
    Check(budget.Evaluate(pending,110)=="startup-telemetry-incomplete","Incomplete startup monitoring accepted indefinitely");
    Check(budget.Evaluate(new GridSafety.Sample{CoverageComplete=false,Telemetry=false},111)=="missing-live-process-telemetry","Incomplete coverage hid real telemetry failure");
    Check(budget.Evaluate(new GridSafety.Sample{CoverageComplete=false,Owned=(2560L<<20)+1},112)=="owned-working-set","Incomplete coverage hid memory violation");
    Check(budget.Evaluate(new GridSafety.Sample(),113)=="startup-telemetry-incomplete","Late complete sample erased an expired coverage gap");
    var settledBudget=new GridSafety.CoverageBudget();
    Check(settledBudget.Evaluate(pending,10)==null && settledBudget.Evaluate(new GridSafety.Sample(),109)==null,"Timely settled coverage rejected");
    Check(settledBudget.Evaluate(pending,114)==null,"New independent startup did not receive bounded coverage window");
    RequireHealthyGuard(null);
    bool unexpectedRejected=false;
    try { RequireHealthyGuard("available-RAM"); } catch(InvalidOperationException) { unexpectedRejected=true; }
    Check(unexpectedRejected,"Successful cleanup hid unexpected watchdog abort");
    RetainedIdentityRegression();
  }
  static void RetainedIdentityRegression() {
    // Pure predicates/delegates only: no handles, jobs or child processes.
    bool currentMembership=false;
    Check(!currentMembership && GridJob.RetainedExitProof(true,true,()=>0,()=> { throw new Exception("No error read after successful wait"); }),"Known exited identity incorrectly required current membership");
    Check(!GridJob.RetainedExitProof(true,true,()=>258,()=>0),"Unsignaled identity certified exit");
    foreach(var flags in new[]{new[]{false,true},new[]{true,false}}) {
      bool rejected=false;
      try { GridJob.RetainedExitProof(flags[0],flags[1],()=> { throw new Exception("Invalid identity must not reach wait"); },()=>0); }
      catch(InvalidOperationException) { rejected=true; }
      Check(rejected,"Missing/mismatched retained ownership accepted");
    }
    bool nativeFailed=false,unexpectedFailed=false;
    try { GridJob.RetainedExitProof(true,true,()=>UInt32.MaxValue,()=>5); }
    catch(System.ComponentModel.Win32Exception error) { nativeFailed=error.NativeErrorCode==5; }
    try { GridJob.RetainedExitProof(true,true,()=>128,()=>0); }
    catch(InvalidOperationException) { unexpectedFailed=true; }
    Check(nativeFailed && unexpectedFailed,"Native telemetry wait failure lost or accepted");
    GridJob.RequireTelemetryClose(true,0,42);
    bool closeFailed=false,unconfirmedClose=false;
    try { GridJob.RequireTelemetryClose(false,6,42); }
    catch(System.ComponentModel.Win32Exception error) { closeFailed=error.NativeErrorCode==6; }
    try { GridJob.RequireTelemetryClose(false,0,42); }
    catch(InvalidOperationException) { unconfirmedClose=true; }
    Check(closeFailed && unconfirmedClose,"Handle closure inferred without native confirmation");
    var nativeException=new System.ComponentModel.Win32Exception(6,"Injected native-probe exception"); bool propagated=false;
    try { GridJob.RetainedExitProof(true,true,()=> { throw nativeException; },()=>0); }
    catch(System.ComponentModel.Win32Exception error) { propagated=Object.ReferenceEquals(error,nativeException); }
    Check(propagated,"Native probe exception replaced or swallowed");
    GridJob.CheckTelemetryIdentity(42,100,42,100);
    foreach(var observed in new[]{new long[]{42,101},new long[]{43,100}}) {
      bool rejected=false;
      try { GridJob.CheckTelemetryIdentity(42,100,(uint)observed[0],observed[1]); }
      catch(InvalidOperationException) { rejected=true; }
      Check(rejected,"PID reuse/identity mismatch accepted");
    }
    RequireTimeoutExitAndReport(true,0,true);
    bool nullExitRejected=false;
    try { RequireTimeoutExitAndReport(true,null,true); } catch(InvalidOperationException) { nullExitRejected=true; }
    Check(nullExitRejected,"Missing fixture exit code accepted");
    foreach(var fixture in new[]{new[]{false,true,true},new[]{true,false,true},new[]{true,true,false}}) {
      bool rejected=false;
      try { RequireTimeoutExitAndReport(fixture[0],fixture[1]?0:1,fixture[2]); }
      catch(InvalidOperationException) { rejected=true; }
      Check(rejected,"Incomplete timeout completion accepted");
    }
    foreach(var json in new[]{
      "{\"passed\":false,\"observedExpectedTimeout\":true,\"firstAbortReason\":\"launcher-timeout\"}",
      "{\"passed\":true,\"observedExpectedTimeout\":true,\"firstAbortReason\":\"launcher-timeout\"}",
      "{\"passed\":false,\"observedExpectedTimeout\":false,\"firstAbortReason\":\"launcher-timeout\"}",
      "{\"passed\":false,\"observedExpectedTimeout\":true,\"firstAbortReason\":\"other\"}"}) {
      using(var doc=JsonDocument.Parse(json)) {
        bool rejected=false;
        try { RequireTimeoutReport(doc.RootElement); } catch(InvalidOperationException) { rejected=true; }
        bool expected=json=="{\"passed\":false,\"observedExpectedTimeout\":true,\"firstAbortReason\":\"launcher-timeout\"}";
        Check(rejected!=expected,"Timeout report proof predicate weakened");
      }
    }
  }
  static void RequireTimeoutExitAndReport(bool exited,int? exitCode,bool reportExists) {
    Check(exited && exitCode==0,"Launcher timeout fixture failed or exit unconfirmed: "+exitCode);
    Check(reportExists,"Missing fixture report is not success");
  }
  static void RequireTimeoutReport(JsonElement report) {
    Check(!report.GetProperty("passed").GetBoolean(),"Fixture cannot certify its own tree termination");
    Check(report.GetProperty("observedExpectedTimeout").GetBoolean() && report.GetProperty("firstAbortReason").GetString()=="launcher-timeout","Wrong launcher timeout observation");
  }
  static string Quote(string value) { if(value.Contains("\"")) throw new Exception("Invalid quoted path"); return "\""+value+"\""; }
  static Process Retain(int pid) { var p=Process.GetProcessById(pid); var h=p.Handle; return p; }
  static void Wait(Func<bool> ready, int ms, string message) {
    var timer=Stopwatch.StartNew(); while(!ready()) { if(timer.ElapsedMilliseconds>=ms) throw new Exception(message); Thread.Sleep(10); }
  }
  static Process[] Pair(GridJob job,string node,string tooling,string folder,string name) {
    string marker=Path.Combine(folder,name+".ready.json");
    var parent=job.StartTracked(node,Quote(Path.Combine(tooling,"sleep-canary.mjs"))+" parent "+Quote(marker),tooling);
    try {
      Wait(()=>File.Exists(marker),1500,"Canary readiness timeout");
      JsonElement data=default(JsonElement);
      Wait(()=> { try { data=JsonDocument.Parse(File.ReadAllText(marker)).RootElement.Clone(); return true; } catch(JsonException) { return false; } },300,"Incomplete canary handshake");
      Check(data.GetProperty("ppid").GetInt32()==parent.Id,"Grandchild parent mismatch");
      var child=Retain(data.GetProperty("pid").GetInt32());
      var ids=job.Pids(); Check(ids.Contains(parent.Id) && ids.Contains(child.Id),"Parent/grandchild ownership mismatch");
      return new[]{parent,child};
    } catch { parent.Dispose(); throw; }
  }
  static void Exited(Process[] processes) {
    foreach(var p in processes) Check(p.WaitForExit(1000),"Retained process handle did not signal termination: "+p.Id);
  }
  static void Cleanup(GridJob job,Process[] processes,GridGuard guard=null,GridEvidence evidence=null) {
    var errors=new List<Exception>();
    if(guard!=null) try { FinishHealthyGuard(guard,evidence); } catch(Exception error) { errors.Add(error); }
    try { job.Stop(); } catch(Exception error) { errors.Add(error); }
    foreach(var process in processes) try { Check(process.WaitForExit(1000),"Cleanup process still alive: "+process.Id); } catch(Exception error) { errors.Add(error); }
    try { Wait(()=>job.Pids().Length==0,1000,"Job not empty after cleanup"); } catch(Exception error) { errors.Add(error); }
    try { job.Dispose(); } catch(Exception error) { errors.Add(error); }
    foreach(var process in processes) try { process.Dispose(); } catch(Exception error) { errors.Add(error); }
    if(errors.Count>0) throw new AggregateException("Owned cleanup failed",errors);
  }
  static void SaveDurable(string path,object value) {
    var bytes=System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value));
    using(var file=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.Read)) { file.Write(bytes,0,bytes.Length); file.Flush(true); }
  }
  static void VerifyLauncherTimeout(string node,string tooling,string output,Process sentinel,GridEvidence evidence) {
    var folder=Path.Combine(output,"launcher-timeout"); Directory.CreateDirectory(folder);
    var job=new GridJob(); var guard=new GridGuard(job,5000);
    var tracked=new List<Process>(); var errors=new List<Exception>();
    GridCapturedProcess captured=null; object captureSummary=null; bool treeProof=false,cleanupVerified=false;
    var diagnostics=new GridEvidence(Path.Combine(output,"launcher-timeout-parent.jsonl"));
    JsonElement report=default(JsonElement); bool reportPresent=false; string observedReason=null;
    var reportPath=Path.Combine(folder,"reported-result.json");
    bool? reportExists=null; object preCleanupObservations=null;
    try {
      diagnostics.Write(new {eventName="parent-capture-started",utc=DateTime.UtcNow,perStreamLimit=65536,survivesFixtureTermination=true});
      captured=job.StartCaptured(node,Quote(Path.Combine(tooling,"launcher-timeout-case.mjs")),tooling,folder,error=>guard.Fail("diagnostic-evidence-failure"));
      var launcher=captured.Process; tracked.Add(launcher);
      diagnostics.Write(new {eventName="fixture-started",utc=DateTime.UtcNow,pid=launcher.Id,created=launcher.StartTime.ToUniversalTime()});
      string marker=Path.Combine(folder,"crash-owner.ready.json");
      Wait(()=>File.Exists(marker),1500,"Launcher timeout fixture did not establish ownership before timeout");
      var ids=JsonSerializer.Deserialize<int[]>(File.ReadAllText(marker)); Check(ids.Length==2,"Expected retained parent/grandchild handles");
      foreach(var pid in ids) tracked.Add(Retain(pid));
      bool exited=launcher.WaitForExit(3500);
      diagnostics.Write(new {eventName="fixture-exit-observed",utc=DateTime.UtcNow,exited,exitCode=exited?(int?)launcher.ExitCode:null,
        signal=(string)null,signalMeaning="Windows exit code from retained native handle"});
      reportExists=File.Exists(reportPath);
      diagnostics.Write(new {eventName="fixture-report-presence",utc=DateTime.UtcNow,exists=reportExists,
        fixtureExitCode=exited?(int?)launcher.ExitCode:null});
      Check(exited,"Launcher timeout fixture did not exit");
      // Persist exit/capture observations before assertions about the fixture's report.
      Exited(tracked.Skip(1).ToArray()); Wait(()=>job.Pids().Length==0,1000,"Launcher timeout left owned processes");
      captureSummary=captured.FinishCapture(); diagnostics.Write(new {eventName="parent-capture-finished",capture=captureSummary});
      RequireTimeoutExitAndReport(exited,launcher.ExitCode,File.Exists(reportPath));
      using(var doc=JsonDocument.Parse(File.ReadAllText(reportPath))) report=doc.RootElement.Clone(); reportPresent=true;
      JsonElement reasonField;
      if(report.TryGetProperty("firstAbortReason",out reasonField) && reasonField.ValueKind==JsonValueKind.String) observedReason=reasonField.GetString();
      RequireTimeoutReport(report);
      Check(!sentinel.HasExited,"Unrelated sentinel lost during launcher termination");
      treeProof=true;
      diagnostics.Write(new {eventName="independent-tree-proof",retainedHandleCount=tracked.Count,allRetainedHandlesExited=true,jobEmpty=true,sentinelAlive=true,report});
    } catch(Exception error) { errors.Add(error); Console.Error.WriteLine("Timeout diagnostic primary failure: "+error); }
    finally {
      // Observations precede parent-forced cleanup. The independent watchdog is
      // still active: these are timestamped observations, not an atomic snapshot.
      var retained=new List<object>();
      foreach(var process in tracked) {
        try { bool exited=process.HasExited; retained.Add(new {pid=process.Id,observedUtc=DateTime.UtcNow,
          exited,exitCode=exited?(int?)process.ExitCode:null}); }
        catch(Exception error) { errors.Add(error); retained.Add(new {observationError=error.ToString()}); }
      }
      int[] preCleanupPids=null; bool? sentinelAlive=null;
      try { preCleanupPids=job.Pids(); } catch(Exception error) { errors.Add(error); }
      try { sentinelAlive=!sentinel.HasExited; } catch(Exception error) { errors.Add(error); }
      reportExists=File.Exists(reportPath);
      preCleanupObservations=new {observedUtc=DateTime.UtcNow,retainedProcesses=retained.ToArray(),
        jobPids=preCleanupPids,jobEmpty=preCleanupPids==null?(bool?)null:preCleanupPids.Length==0,
        sentinelAlive,fixtureReportExists=reportExists,supervisorGuardAbortReason=guard.Reason,retainedIdentities=job.TelemetrySnapshot(),
        supervisorGuardCleanupErrors=guard.Abort.CleanupErrors,independentGuardStillActive=true};
      try { diagnostics.Write(new {eventName="before-parent-forced-cleanup",observations=preCleanupObservations}); }
      catch(Exception error) { errors.Add(error); Console.Error.WriteLine("Pre-cleanup diagnostic write failed: "+error); }
      try { FinishHealthyGuard(guard); } catch(Exception error) { errors.Add(error); }
      try { job.Stop(); Exited(tracked.ToArray()); Wait(()=>job.Pids().Length==0,1000,"Timeout cleanup job not empty"); cleanupVerified=true; }
      catch(Exception error) { errors.Add(error); Console.Error.WriteLine("Timeout diagnostic cleanup failure: "+error); }
      if(captured!=null && captureSummary==null) {
        try { captureSummary=captured.FinishCapture(); }
        catch(Exception error) { errors.Add(error); Console.Error.WriteLine("Timeout capture incomplete: "+error); }
      }
      if(captured!=null) try { captured.Dispose(); } catch(Exception error) { errors.Add(error); }
      try { job.Dispose(); } catch(Exception error) { errors.Add(error); }
      foreach(var process in tracked) if(captured==null || !Object.ReferenceEquals(process,captured.Process))
        try { process.Dispose(); } catch(Exception error) { errors.Add(error); }
      try {
        diagnostics.Write(new {eventName="parent-diagnostic-complete",utc=DateTime.UtcNow,capture=captureSummary,treeProof,cleanupVerified,
          fixtureReportExists=reportExists,fixtureReportPresent=reportPresent,fixtureReportedAbortReason=observedReason,
          supervisorGuardAbortReason=guard.Reason,supervisorGuardCleanupErrors=guard.Abort.CleanupErrors,guardObservations=guard.Snapshot(),
          preCleanupObservations,errors=errors.Select(e=>e.ToString()).ToArray()});
      } catch(Exception error) { errors.Add(error); Console.Error.WriteLine("Parent diagnostic write failed: "+error); }
      try { diagnostics.Dispose(); } catch(Exception error) { errors.Add(error); }
    }
    bool passed=errors.Count==0 && treeProof && cleanupVerified && captureSummary!=null;
    // Only the surviving parent writes result.json, after verified teardown.
    SaveDurable(Path.Combine(folder,"result.json"),new {passed,treeTerminationProven=treeProof,cleanupVerified,capture=captureSummary,
      firstAbortReason=observedReason,fixtureReportedAbortReason=observedReason,
      supervisorGuardAbortReason=guard.Reason,supervisorGuardCleanupErrors=guard.Abort.CleanupErrors,
      fixtureReportExists=reportExists,fixtureReportPresent=reportPresent,preCleanupObservations,
      errors=errors.Select(e=>e.ToString()).ToArray()});
    if(!passed) throw new AggregateException("Launcher timeout proof failed; diagnostics preserved by surviving parent",errors);
    evidence.Write(new {eventName="launcher-timeout-confirmed",shortenedDeadlineMs=2000,outerDeadlineMs=30000,implementation="owned-shell.mjs",
      reason="launcher-timeout",treeTerminationProven=true,sentinelAlive=!sentinel.HasExited});
  }
  public static void CrashOwner(string node,string tooling,string output) {
    // The test kills this host process. Its non-inherited job handle must close
    // through OS process teardown, not cooperative Dispose/finally.
    using(var job=new GridJob()) {
      job.VerifyLimits();
      var pair=Pair(job,node,tooling,output,"crash-owned-pair");
      File.WriteAllText(Path.Combine(output,"crash-owner.ready.json"),JsonSerializer.Serialize(pair.Select(p=>p.Id).ToArray()));
      Thread.Sleep(15000);
    }
  }
  public static void Run(string node,string tooling,string output,string host) {
    var results=new List<object>();
    var names=new[]{"limits-and-ownership","explicit-stop","kill-on-close","supervisor-failure","watchdog-timeout","synthetic-resource-failures","evidence-write-failure","launcher-timeout","sentinel-and-teardown"};
    int index=0; string status="failed"; bool teardown=false;
    GridJob sentinelJob=null; Process sentinel=null;
    using(var evidence=new GridEvidence(Path.Combine(output,"verification.jsonl"))) {
      try {
        sentinelJob=new GridJob(); sentinelJob.VerifyLimits();
        sentinel=sentinelJob.StartTracked(node,Quote(Path.Combine(tooling,"sleep-canary.mjs"))+" sentinel "+Quote(Path.Combine(output,"sentinel.ready.json")),tooling);
        // This outer budget persists across every test, independent of evidence IO.
        using(var sentinelGuard=new GridGuard(sentinelJob,25000)) {
          Action<string,Action> test=(name,action)=> {
            evidence.Write(new {eventName="case-started",name});
            action(); Check(!sentinel.HasExited,"Unrelated sentinel terminated");
            Check(sentinelGuard.Reason==null,"Overall verification budget exceeded");
            var result=new {name,status="passed"}; results.Add(result); evidence.Write(result); index++;
          };
          test(names[index],()=> {
            var job=new GridJob(); var pair=new Process[0];
            using(var guard=new GridGuard(job,4000)) {
              try { job.VerifyLimits(); pair=Pair(job,node,tooling,output,"membership"); Check(GridSafety.WorkingSet(job)>0,"Missing telemetry");
                evidence.Write(new {eventName="owned-identities",pids=pair.Select(p=>new {pid=p.Id,started=p.StartTime.ToUniversalTime()}).ToArray(),sentinel=sentinel.Id}); }
              finally { Cleanup(job,pair,guard,evidence); }
            }
          });
          test(names[index],()=> {
            var job=new GridJob(); var pair=new Process[0];
            using(var guard=new GridGuard(job,4000)) { try { pair=Pair(job,node,tooling,output,"stop"); job.Stop(); Exited(pair); Wait(()=>job.Pids().Length==0,1000,"Explicit stop job not empty"); }
              finally { Cleanup(job,pair,guard,evidence); } }
          });
          test(names[index],()=> {
            var job=new GridJob(); var pair=new Process[0]; bool closed=false;
            using(var guard=new GridGuard(job,4000)) {
              try { pair=Pair(job,node,tooling,output,"close"); FinishHealthyGuard(guard,evidence); job.Dispose(); closed=true; Exited(pair); }
              finally { if(!closed) Cleanup(job,pair,guard); else { guard.Dispose(); foreach(var p in pair) p.Dispose(); } }
            }
          });
          test(names[index],()=> {
            var job=new GridJob(); var tracked=new List<Process>();
            using(var guard=new GridGuard(job,5000)) {
              try {
                var owner=job.StartTracked(host,"-NoProfile -NonInteractive -File "+Quote(Path.Combine(tooling,"local-supervisor.ps1"))+" -Mode CrashOwner",tooling); tracked.Add(owner);
                var marker=Path.Combine(output,"crash-owner.ready.json"); Wait(()=>File.Exists(marker),3500,"Crash-owner readiness timeout");
                var ids=JsonSerializer.Deserialize<int[]>(File.ReadAllText(marker)); foreach(var pid in ids) tracked.Add(Retain(pid));
                owner.Kill(); Check(owner.WaitForExit(1000),"Owner did not terminate");
                Exited(tracked.Skip(1).ToArray()); Wait(()=>job.Pids().Length==0,1000,"Orphans after supervisor failure");
              } finally { Cleanup(job,tracked.ToArray(),guard,evidence); }
            }
          });
          test(names[index],()=> {
            var job=new GridJob(); var pair=new Process[0];
            try {
              pair=Pair(job,node,tooling,output,"watchdog");
              using(var guard=new GridGuard(job,150)) {
                // Main verifier deliberately sleeps; no polling/control-file help.
                Thread.Sleep(250); Exited(pair);
                Check(guard.Reason=="monotonic-watchdog-timeout","Watchdog did not enforce its deadline");
                Check(guard.Abort.CleanupErrors.Length==0,"Watchdog termination cleanup failed");
                evidence.Write(new {eventName="expected-abort",reason=guard.Reason,observations=guard.Snapshot(),successMarker=false});
              }
            } finally { Cleanup(job,pair); }
          });
          test(names[index],()=> {
            TelemetryExitRaceRegression();
            GridJob.StartupLifecycleRegression();
            GridJob.LiveTelemetryRegression();
            Check(GridSafety.Violation(new GridSafety.Sample())==null,"Safe synthetic input rejected");
            var inputs=new[]{
              new GridSafety.Sample{Available=1},new GridSafety.Sample{Browser=1536L*1024*1024+1},
              new GridSafety.Sample{Owned=2560L*1024*1024+1},new GridSafety.Sample{Growth=256L*1024*1024+1},
              new GridSafety.Sample{Unsettled=128L*1024*1024+1},new GridSafety.Sample{Telemetry=false},
              new GridSafety.Sample{Evidence=false},new GridSafety.Sample{Phase=false},new GridSafety.Sample{Fresh=false}};
            var expected=new[]{"available-RAM","browser-working-set","owned-working-set","growth","settlement","missing-live-process-telemetry","evidence-failure","invalid-or-stale-phase","invalid-or-stale-phase"};
            for(int inputIndex=0;inputIndex<inputs.Length;inputIndex++) {
              var reason=GridSafety.Violation(inputs[inputIndex]);
              Check(reason==expected[inputIndex],"Wrong policy abort reason: expected "+expected[inputIndex]+", got "+reason);
              var job=new GridJob(); var pair=new Process[0];
              try { pair=Pair(job,node,tooling,output,"synthetic-"+Guid.NewGuid().ToString("N"));
                var guard=new GridGuard(job,2000);
                using(guard) {
                  guard.Fail(reason); Exited(pair);
                  // Exercise the exact healthy-sample path that used to erase a
                  // previous failure; null must never replace the first reason.
                  guard.Abort.Observe(GridSafety.Violation(new GridSafety.Sample()));
                  guard.Fail("secondary-abort-must-not-replace-first");
                  guard.Abort.RecordCleanup(new IOException("synthetic-secondary-cleanup-error"));
                  Check(guard.Reason==expected[inputIndex],"Original failure lost: expected "+expected[inputIndex]+", got "+guard.Reason);
                  Check(guard.Abort.CleanupErrors.Any(e=>e.Contains("synthetic-secondary-cleanup-error")),"Secondary cleanup evidence lost");
                  Check(guard.Abort.CleanupErrors.Length==1,"Unexpected real cleanup error alongside synthetic evidence");
                }
                Check(guard.Reason==expected[inputIndex],"Dispose replaced original reason");
                evidence.Write(new {eventName="expected-abort",expected=expected[inputIndex],actual=guard.Reason,cleanup=guard.Abort.CleanupErrors,observations=guard.Snapshot(),successMarker=false});
              } finally { Cleanup(job,pair); }
            }
          });
          test(names[index],()=> {
            var job=new GridJob(); var pair=new Process[0];
            try { pair=Pair(job,node,tooling,output,"io-failure");
              using(var guard=new GridGuard(job,2000)) {
                bool rejected=false;
                using(var broken=new GridEvidence(Path.Combine(output,"injected-write-failure.jsonl"),true)) {
                  try { broken.Write(new {eventName="must-not-complete"}); }
                  catch(IOException error) { rejected=true; guard.Fail("evidence-write-failure"); Console.Error.WriteLine("Expected injected failure: "+error.Message); }
                }
                Check(rejected,"Injected writer failure was ignored"); Exited(pair);
                Check(guard.Reason=="evidence-write-failure","Wrong evidence failure reason: "+guard.Reason);
                Check(guard.Abort.CleanupErrors.Length==0,"Evidence failure termination cleanup failed");
                evidence.Write(new {eventName="expected-abort",expected="evidence-write-failure",actual=guard.Reason,observations=guard.Snapshot(),successMarker=false});
              }
            } finally { Cleanup(job,pair); }
          });
          test(names[index],()=>VerifyLauncherTimeout(node,tooling,output,sentinel,evidence));
          test(names[index],()=> { Check(!sentinel.HasExited,"Sentinel lost"); });
          FinishHealthyGuard(sentinelGuard,evidence);
          Check(!sentinel.HasExited,"Sentinel lost before intentional final cleanup");
        }
        sentinelJob.Stop(); Check(sentinel.WaitForExit(1000),"Sentinel cleanup failed");
        Wait(()=>sentinelJob.Pids().Length==0,1000,"Sentinel job not empty"); teardown=true; status="passed";
      } catch(Exception error) {
        results.Add(new {name=index<names.Length?names[index]:"final-teardown",status="failed",error=error.ToString()});
        for(int i=index+1;i<names.Length;i++) results.Add(new {name=names[i],status="incomplete-not-run"});
        Console.Error.WriteLine(error);
      } finally {
        if(sentinelJob!=null) {
          try { sentinelJob.Stop(); if(sentinel!=null) Check(sentinel.WaitForExit(1000),"Sentinel cleanup timeout"); Check(sentinelJob.Pids().Length==0,"Sentinel cleanup job not empty"); }
          catch(Exception cleanup) { status="failed"; teardown=false; results.Add(new {name="cleanup",status="failed",error=cleanup.ToString()}); Console.Error.WriteLine(cleanup); }
          finally {
            try { sentinelJob.Dispose(); if(sentinel!=null) sentinel.Dispose(); }
            catch(Exception cleanup) { status="failed"; teardown=false; results.Add(new {name="final-handle-disposal",status="failed",error=cleanup.ToString()}); Console.Error.WriteLine(cleanup); }
          }
        }
      }
      var summary=new {status,teardownVerified=teardown,results,stage0=false,build=false,chromium=false,performance=false,retries=0};
      evidence.Write(new {eventName="verification-finished",summary});
      // Authoritative summary is flushed only after retained handles confirm exit.
      var bytes=System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(summary));
      using(var file=new FileStream(Path.Combine(output,"verification-result.json"),FileMode.CreateNew,FileAccess.Write,FileShare.Read)) { file.Write(bytes,0,bytes.Length); file.Flush(true); }
      if(status!="passed") throw new Exception("Verification failed; no retry");
    }
  }
}
