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
  public GridCapturedProcess(Process process,SafeFileHandle output,SafeFileHandle error,string folder,Action<Exception> onFailure) {
    Process=process;
    var handles=new[]{output,error};
    var startedDrains=new bool[2];
    try {
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
    } catch(Exception original) {
      var errors=new List<Exception>{original};
      try { onFailure(original); } catch(Exception cleanup) { errors.Add(cleanup); }
      for(int index=0;index<2;index++) {
        if(startedDrains[index]) { if(!drains[index].Join(500)) errors.Add(new IOException("Capture construction drain timeout")); }
        else handles[index].Dispose();
      }
      throw new AggregateException(errors);
    }
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
  public void Dispose() { Process.Dispose(); }
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
    bool initialized=false,retained=false; Process tracked=null;
    Exception primaryFailure=null;
    try {
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
      Exception original=null;
      try {
        Check(AssignProcessToJobObject(handle,info.process)); tracked=Process.GetProcessById((int)info.pid); var retainedHandle=tracked.Handle; retained=true;
        if(ResumeThread(info.thread)==UInt32.MaxValue) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Resume captured process");
      } catch(Exception failure) {
        original=failure;
        try { Check(TerminateProcess(info.process,1)); if(WaitForSingleObject(info.process,1000)!=0) throw new Exception("Captured process cleanup timeout"); }
        catch(Exception cleanup) { original=new AggregateException(failure,cleanup); throw original; }
        throw;
      } finally { CloseBoth(info.thread,info.process,original); }
      var readerOut=new SafeFileHandle(outRead,true); outRead=IntPtr.Zero;
      var readerErr=new SafeFileHandle(errRead,true); errRead=IntPtr.Zero;
      return new GridCapturedProcess(tracked,readerOut,readerErr,folder,onFailure);
    } catch(Exception error) {
      var errors=new List<Exception>{error};
      if(retained) CleanupRetained(tracked,errors); else if(tracked!=null) tracked.Dispose();
      primaryFailure=errors.Count>1?new AggregateException(errors):error;
      throw primaryFailure;
    }
    finally {
      if(initialized) DeleteProcThreadAttributeList(list);
      if(list!=IntPtr.Zero) Marshal.FreeHGlobal(list); if(handles!=IntPtr.Zero) Marshal.FreeHGlobal(handles);
      var closeErrors=new List<Exception>();
      foreach(var h in new[]{outWrite,errWrite,input,outRead,errRead}) if(h!=IntPtr.Zero && h!=new IntPtr(-1)) {
        if(!CloseHandle(h)) closeErrors.Add(new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Close capture handle"));
      }
      if(closeErrors.Count>0) {
        if(primaryFailure!=null) closeErrors.Insert(0,primaryFailure);
        else if(retained) CleanupRetained(tracked,closeErrors);
        throw new AggregateException(closeErrors);
      }
    }
  }
}
