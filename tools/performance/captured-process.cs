using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Threading;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

// Capture runs in the surviving native supervisor, outside the fixture's job.
// Drain both pipes even after the 64KiB evidence cap to avoid child backpressure.
public sealed class GridCapturedProcess : IDisposable {
  public readonly Process Process;
  readonly Thread[] drains=new Thread[2];
  readonly long[] total=new long[2], saved=new long[2];
  readonly string[] failures=new string[2];
  readonly DateTime started=DateTime.UtcNow;
  readonly SafeFileHandle[] handles;
  readonly bool[] startedDrains=new bool[2];
  readonly string folder;
  readonly Action<Exception> onFailure;
  static readonly HashSet<GridCapturedProcess> incompleteCaptures=new HashSet<GridCapturedProcess>();
  public GridCapturedProcess(Process process,SafeFileHandle output,SafeFileHandle error,string folder,Action<Exception> onFailure) {
    // No readers start until the caller has received this owner successfully.
    var owned=new[]{output,error};
    Process=process; handles=owned; this.folder=folder; this.onFailure=onFailure;
  }
  public void StartReaders() {
    for(int index=0;index<2;index++) {
      int stream=index;
      drains[index]=new Thread(()=> {
        try {
          using(var pipe=new FileStream(handles[stream],FileAccess.Read))
          using(var file=new FileStream(Path.Combine(folder,stream==0?"fixture.stdout.log":"fixture.stderr.log"),FileMode.CreateNew,FileAccess.Write,FileShare.Read)) {
            var buffer=new byte[4096]; int count;
            while((count=pipe.Read(buffer,0,buffer.Length))>0) {
              Interlocked.Add(ref total[stream],count);
              int keep=(int)Math.Min(count,65536-saved[stream]);
              if(keep>0) { file.Write(buffer,0,keep); file.Flush(true); Interlocked.Add(ref saved[stream],keep); }
            }
          }
        } catch(Exception failure) {
          failures[stream]=failure.ToString();
          try { onFailure(failure); } catch(Exception cleanup) { failures[stream]+="\nCapture cleanup failure: "+cleanup; Console.Error.WriteLine(cleanup); }
        } finally { handles[stream].Dispose(); }
      }); drains[index].IsBackground=true;
    }
    for(int index=0;index<2;index++) { drains[index].Start(); startedDrains[index]=true; }
  }
  public object FinishCapture() {
    foreach(var drain in drains) if(!drain.Join(500)) throw new IOException("Parent pipe capture did not finish within deadline");
    if(failures[0]!=null || failures[1]!=null) throw new IOException("Parent capture failure: "+String.Join(";",failures));
    if(!Process.HasExited) throw new InvalidOperationException("Cannot finalize diagnostics for live fixture");
    return new {startedUtc=started,finishedUtc=DateTime.UtcNow,pid=Process.Id,exitCode=Process.ExitCode,
      signal=(string)null,signalMeaning="Windows retained-process handle supplies exit code, not POSIX signal",
      stdoutBytes=total[0],stderrBytes=total[1],stdoutSaved=saved[0],stderrSaved=saved[1],
      stdoutTruncated=total[0]>saved[0],stderrTruncated=total[1]>saved[1],captureLimitPerStream=65536};
  }
  public void Dispose() {
    var errors=new List<Exception>(); bool incomplete=false;
    for(int index=0;index<2;index++) {
      if(startedDrains[index]) {
        if(!drains[index].Join(500)) { incomplete=true; errors.Add(new IOException("Capture reader cleanup unconfirmed: "+index)); }
      } else try { handles[index].Dispose(); } catch(Exception error) { errors.Add(error); }
      if(failures[index]!=null) errors.Add(new IOException(failures[index]));
    }
    // Never close a live reader's handle underneath its synchronous Read. Keep
    // an explicit owner if bounded joining cannot establish completion.
    lock(incompleteCaptures) { if(incomplete) incompleteCaptures.Add(this); else incompleteCaptures.Remove(this); }
    if(!incomplete) try { Process.Dispose(); } catch(Exception error) { errors.Add(error); }
    if(errors.Count>0) throw new AggregateException("Capture cleanup failed",errors);
  }
}

public sealed partial class GridJob {
  [StructLayout(LayoutKind.Sequential)] struct SECURITY {public int length; public IntPtr descriptor; public int inherit;}
  [StructLayout(LayoutKind.Sequential)] struct EXSTART {public START start; public IntPtr attributes;}
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CreatePipe(out IntPtr read,out IntPtr write,ref SECURITY security,uint size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetHandleInformation(IntPtr handle,uint mask,uint flags);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFile(string path,uint access,uint share,ref SECURITY security,uint creation,uint flags,IntPtr template);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,uint flags,ref IntPtr size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll",EntryPoint="CreateProcessW",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateCapturedProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref EXSTART start,out INFO info);
  public GridCapturedProcess StartCaptured(string executable,string arguments,string cwd,string folder,Action<Exception> onFailure) {
    var security=new SECURITY{length=Marshal.SizeOf(typeof(SECURITY)),inherit=1};
    IntPtr outRead=IntPtr.Zero,outWrite=IntPtr.Zero,errRead=IntPtr.Zero,errWrite=IntPtr.Zero,input=IntPtr.Zero,list=IntPtr.Zero,handles=IntPtr.Zero;
    bool initialized=false; Process tracked=null;
    GridCapturedProcess capture=null;
    SafeFileHandle readerOut=null,readerErr=null;
    var errors=new List<Exception>();
    bool exceptionalCleanupAttempted=false;
    var child=ReserveChild();
    try {
    try {
      CheckStartupAdmission();
      Check(CreatePipe(out outRead,out outWrite,ref security,4096)); Check(CreatePipe(out errRead,out errWrite,ref security,4096));
      Check(SetHandleInformation(outRead,1,0)); Check(SetHandleInformation(errRead,1,0));
      input=CreateFile("NUL",0x80000000,3,ref security,3,0,IntPtr.Zero); Check(input!=new IntPtr(-1));
      IntPtr size=IntPtr.Zero;
      InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);
      if(size==IntPtr.Zero) throw new InvalidOperationException("Attribute-list size unavailable");
      list=Marshal.AllocHGlobal(size); Check(InitializeProcThreadAttributeList(list,1,0,ref size)); initialized=true;
      handles=Marshal.AllocHGlobal(3*IntPtr.Size);
      Marshal.WriteIntPtr(handles,0,input); Marshal.WriteIntPtr(handles,IntPtr.Size,outWrite); Marshal.WriteIntPtr(handles,2*IntPtr.Size,errWrite);
      // Selective inheritance: only stdout/stderr/NUL, never unrelated job handles.
      Check(UpdateProcThreadAttribute(list,0,new IntPtr(0x20002),handles,new IntPtr(3*IntPtr.Size),IntPtr.Zero,IntPtr.Zero));
      var start=new EXSTART(); start.start.cb=(uint)Marshal.SizeOf(typeof(EXSTART)); start.start.flags=0x100;
      start.start.input=input; start.start.output=outWrite; start.start.error=errWrite; start.attributes=list;
      INFO info;
      Check(CreateCapturedProcess(executable,new StringBuilder("\""+executable+"\" "+arguments),IntPtr.Zero,IntPtr.Zero,true,0x4|0x08000000|0x80000,IntPtr.Zero,cwd,ref start,out info));
      lock(child) { child.Process=info.process; child.Thread=info.thread; child.State=StartupState.Created; }
      try {
        CheckStartupAdmission();
        Check(AssignProcessToJobObject(handle,info.process)); tracked=Process.GetProcessById((int)info.pid); var retainedHandle=tracked.Handle;
        lock(child) child.State=StartupState.Assigned;
        CheckStartupAdmission();
        if(ResumeThread(info.thread)==UInt32.MaxValue) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Resume captured process");
        TransferChild(child,errors);
      } finally { CloseChildThread(child,errors); }
      if(errors.Count>0) throw new AggregateException("Native capture startup cleanup failed",errors.ToArray());
      readerOut=new SafeFileHandle(outRead,true); outRead=IntPtr.Zero;
      readerErr=new SafeFileHandle(errRead,true); errRead=IntPtr.Zero;
      capture=new GridCapturedProcess(tracked,readerOut,readerErr,folder,onFailure);
      readerOut=null; readerErr=null; // Transfer only after owner construction returns.
      capture.StartReaders();
    } catch(Exception error) {
      errors.Add(error);
    }
    finally {
      try { if(initialized) DeleteProcThreadAttributeList(list); } catch(Exception error) { errors.Add(error); }
      try { if(list!=IntPtr.Zero) Marshal.FreeHGlobal(list); } catch(Exception error) { errors.Add(error); }
      try { if(handles!=IntPtr.Zero) Marshal.FreeHGlobal(handles); } catch(Exception error) { errors.Add(error); }
      foreach(var h in new[]{outWrite,errWrite,input,outRead,errRead}) if(h!=IntPtr.Zero && h!=new IntPtr(-1)) {
        if(!CloseHandle(h)) errors.Add(new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Close capture handle"));
      }
      try { if(readerOut!=null) readerOut.Dispose(); } catch(Exception error) { errors.Add(error); }
      try { if(readerErr!=null) readerErr.Dispose(); } catch(Exception error) { errors.Add(error); }
    }
    if(errors.Count>0) {
      // Still own capture when finally failed: stop producers before joining,
      // and attempt every cleanup even after the first failure.
      try { onFailure(new AggregateException(errors.ToArray())); } catch(Exception error) { errors.Add(error); }
      TerminateAndConfirm(child,1000,errors);
      CleanupRetained(tracked,errors);
      if(capture!=null) try { capture.Dispose(); } catch(Exception error) { errors.Add(error); }
      exceptionalCleanupAttempted=true;
    }
    } finally { CompleteStartup(child,errors); }
    if(errors.Count>0 && !exceptionalCleanupAttempted) {
      CleanupRetained(tracked,errors);
      if(capture!=null) try { capture.Dispose(); } catch(Exception error) { errors.Add(error); }
    }
    if(errors.Count>0) {
      RecordTeardownErrors(errors); // Includes late managed-process/reader cleanup errors.
      throw new GridTeardownException(this,"Captured process startup/cleanup failed",errors);
    }
    return capture;
  }
}
