import { spawn } from 'node:child_process';

// Historical module name; direct executable spawn deliberately avoids a shell.
// A timeout is a bounded failure outcome, never proof of tree termination.
export function ownedShell(executable, args, { cwd, env, stdio, timeoutMs, onEvent }) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30000) throw new Error('Invalid launcher deadline');
  const started = performance.now();
  const child = spawn(executable, args, { cwd, env, stdio, shell: false, windowsHide: true });
  let state = 'starting';
  let code = null;
  let signal = null;
  let firstAbortReason = null;
  let cleanup = null;
  let stopAttempted = false;
  let settled = false;
  let finishing = false;
  let diagnosticFailure = null;
  const events = [];
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  function latch(reason) { if (firstAbortReason === null) firstAbortReason = reason; }
  function emit(value) {
    const event = { utc: new Date().toISOString(), elapsedMs: performance.now() - started, ...value };
    events.push(Promise.resolve().then(() => onEvent(event)).catch(error => {
      diagnosticFailure ??= error.message;
      latch('diagnostic-evidence-failure');
      if (!stopAttempted && state === 'running') stop('diagnostic-evidence-failure');
    }));
  }
  function snapshot(diagnosticsConfirmed) {
    return { code, signal, processPid: child.pid ?? null, processState: state,
      exited: state === 'exited', firstAbortReason,
      cleanup: cleanup ? { ...cleanup, directExitConfirmed: state === 'exited',
        outcome: state === 'exited' ? 'direct-exit-confirmed' : 'teardown-unconfirmed' } : null,
      directExitConfirmed: state === 'exited', treeTerminationProven: false,
      diagnosticFailure, diagnosticsConfirmed, elapsedMs: performance.now() - started,
      timerArmed: true, timeoutMs, shell: false };
  }
  function settle(diagnosticsConfirmed) {
    if (settled) return;
    settled = true;
    clearTimeout(stopTimer); clearTimeout(hardTimer);
    resolveDone(snapshot(diagnosticsConfirmed));
  }
  async function finish() {
    if (finishing || settled) return;
    finishing = true;
    await Promise.all(events);
    settle(diagnosticFailure === null);
  }
  function stop(reason) {
    latch(reason);
    if (!stopAttempted) {
      if (state === 'running') {
        stopAttempted = true;
        // ChildProcess.kill uses Node/libuv's retained Windows process handle.
        // No taskkill, numeric-PID fallback, PATH lookup or exitCode-only liveness.
        try {
          const accepted = child.kill('SIGKILL');
          cleanup = { method: 'retained-child-handle', killRequested: accepted,
            error: accepted ? null : 'Retained-handle termination was not accepted', treeTerminationProven: false };
        } catch (error) {
          cleanup = { method: 'retained-child-handle', killRequested: false, error: error.message, treeTerminationProven: false };
        }
      } else {
        cleanup = { method: 'no-pid-fallback', killRequested: false,
          error: state === 'starting' ? 'Process identity not confirmed; cleanup withheld' : null,
          treeTerminationProven: false };
      }
      emit({ event: 'owned-process-stop-request', reason: firstAbortReason, processState: state, ...cleanup });
    }
    return done;
  }
  const cleanupReserve = Math.min(500, timeoutMs / 4);
  const stopTimer = setTimeout(() => { stop('launcher-timeout'); }, timeoutMs - cleanupReserve);
  const hardTimer = setTimeout(() => {
    stop('launcher-timeout');
    emit({ event: 'cleanup-deadline', processState: state, exitConfirmed: state === 'exited',
      treeTerminationProven: false, evidenceMayBeIncomplete: true });
    // Bounded result does not depend on child exit or diagnostic fsync completion.
    settle(false);
  }, timeoutMs);
  child.once('spawn', () => {
    state = 'running'; emit({ event: 'owned-process-spawn', pid: child.pid });
    // A stop withheld before identity existed is not a kill attempt. Once spawn
    // confirms the retained handle, honor that pending stop exactly once.
    if (firstAbortReason !== null && !stopAttempted) stop(firstAbortReason);
  });
  child.on('error', error => {
    latch('process-error');
    emit({ event: 'owned-process-error', message: error.message, code: error.code, processState: state });
    if (state === 'starting') {
      state = 'spawn-failed';
      finish().catch(error => { diagnosticFailure = error.message; settle(false); });
    } else stop('process-error');
  });
  child.once('exit', (exitCode, exitSignal) => {
    state = 'exited'; code = exitCode; signal = exitSignal;
    emit({ event: 'owned-process-exit', pid: child.pid, code, signal });
    finish().catch(error => { diagnosticFailure = error.message; settle(false); });
  });
  return { child, stop, done };
}
