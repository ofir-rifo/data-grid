using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
using Microsoft.Win32.SafeHandles;

// Finalization closes an abandoned job handle (kill-on-close) if construction or
// a later managed exception prevents the normal explicit cleanup path.
public sealed class GridJobHandle : SafeHandleZeroOrMinusOneIsInvalid {
  public int CloseError;
  public GridJobHandle():base(true) {}
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr value);
  protected override bool ReleaseHandle() { bool ok=CloseHandle(handle); if(!ok) CloseError=Marshal.GetLastWin32Error(); return ok; }
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
  static void Check(bool ok) { if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  static void CleanupRetained(Process process,List<Exception> errors) {
    if(process==null) return;
    try {
      if(!process.HasExited) process.Kill();
      if(!process.WaitForExit(1000)) errors.Add(new InvalidOperationException("Retained process cleanup timeout"));
    } catch(Exception error) { errors.Add(error); }
    finally { try { process.Dispose(); } catch(Exception error) { errors.Add(error); } }
  }
  static void CloseBoth(IntPtr first,IntPtr second,Exception original) {
    var errors=new List<Exception>();
    if(!CloseHandle(first)) errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Close thread handle"));
    if(!CloseHandle(second)) errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"Close process handle"));
    if(errors.Count>0) { if(original!=null) errors.Insert(0,original); throw new AggregateException(errors); }
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
    var start = new START(); start.cb = (uint)Marshal.SizeOf(typeof(START)); INFO info;
    Check(CreateProcess(executable, new StringBuilder("\"" + executable + "\" " + arguments), IntPtr.Zero, IntPtr.Zero, false,
      0x4 | 0x08000000, IntPtr.Zero, cwd, ref start, out info));
    Process tracked = null;
    Exception failure=null;
    try {
      if (!AssignProcessToJobObject(handle, info.process)) {
        throw new Win32Exception(Marshal.GetLastWin32Error(), "AssignProcessToJobObject");
      }
      tracked = Process.GetProcessById((int)info.pid);
      var retainedHandle = tracked.Handle;
      if (ResumeThread(info.thread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread");
      return tracked;
    } catch (Exception original) {
      failure=original;
      try {
        Check(TerminateProcess(info.process, 1));
        if (WaitForSingleObject(info.process, 1000) != 0) throw new InvalidOperationException("Suspended-process cleanup timeout");
      } catch (Exception cleanup) { failure=new AggregateException(original, cleanup); throw failure; }
      finally { if(tracked!=null) tracked.Dispose(); }
      throw;
    } finally {
      try { CloseBoth(info.thread,info.process,failure); }
      catch(Exception closeError) {
        if(failure==null) { var errors=new List<Exception>{closeError}; CleanupRetained(tracked,errors); throw new AggregateException(errors); }
        throw;
      }
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
    const int size = 65536; IntPtr buffer = Marshal.AllocHGlobal(size);
    try {
      uint returned; Check(QueryInformationJobObject(handle, 3, buffer, size, out returned));
      int count = Marshal.ReadInt32(buffer, 4);
      if (count > (size-8)/IntPtr.Size) throw new InvalidOperationException("Process inventory overflow");
      int[] pids = new int[count];
      for (int i=0; i<count; i++) pids[i] = Marshal.ReadIntPtr(buffer, 8+i*IntPtr.Size).ToInt32();
      return pids;
    } finally { Marshal.FreeHGlobal(buffer); }
  }
  public static MEMORY Memory() { var m = new MEMORY(); m.length=(uint)Marshal.SizeOf(typeof(MEMORY)); Check(GlobalMemoryStatusEx(ref m)); return m; }
  public void Stop() { if (handle != null && !handle.IsClosed && !handle.IsInvalid) Check(TerminateJobObject(handle, 1)); }
  public void Dispose() { if(handle!=null) { handle.Dispose(); if(handle.CloseError!=0) throw new Win32Exception(handle.CloseError,"Close job handle"); } }
}
