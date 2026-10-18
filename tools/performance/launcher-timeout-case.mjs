import { mkdir, open, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ownedShell } from './owned-shell.mjs';

const host = 'C:\\Users\\ofirr\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe';
const output = join(process.env.GRID_PERF_VERIFY_OUTPUT, 'launcher-timeout');
await mkdir(output, { recursive: true });
const fd = await open(join(output, 'timeout.jsonl'), 'ax');
async function record(value) {
  const line=JSON.stringify({utc:new Date().toISOString(),...value}) + '\n';
  // Independent parent capture receives lifecycle/termination events even if the
  // fixture later throws before its own file flush or result-writing path.
  process.stdout.write(line);
  await fd.write(line); await fd.sync();
}
const script = join(import.meta.dirname, 'local-supervisor.ps1');
await record({ event: 'shortened-launcher-deadline-armed', timeoutMs: 2000, sameImplementationAsOuter30000ms: true });
const launch = ownedShell(host, ['-NoProfile','-NonInteractive','-File',script,'-Mode','CrashOwner'], {
  // Both this process and its child use the parent supervisor's bounded pipes.
  cwd: import.meta.dirname, timeoutMs: 2000, onEvent: record, stdio: ['ignore','inherit','inherit'],
  env: { ...process.env, GRID_PERF_VERIFY_OUTPUT: output },
});
try {
  const result = await launch.done;
  const observedExpectedTimeout = result.firstAbortReason === 'launcher-timeout' && result.diagnosticsConfirmed && result.exited &&
    result.cleanup?.error === null && result.cleanup?.killRequested === true && result.directExitConfirmed &&
    (result.code !== null ? result.code !== 0 : result.signal !== null) && result.elapsedMs < 4500;
  // A self-report is never a PASS: only the surviving owner can prove tree exit.
  const report = { status:'reported-not-validated', observedExpectedTimeout, passed:false, ...result };
  await record({ event: 'fixture-reported', ...report });
  await writeFile(join(output, 'reported-result.json'), JSON.stringify(report), { flush: true });
  process.exitCode = observedExpectedTimeout ? 0 : 1;
} catch(error) {
  process.exitCode=1;
  // Console output is drained/persisted by the surviving native supervisor.
  console.error('Timeout fixture failed:',error.stack ?? error.message);
  try {
    await record({event:'fixture-failed',message:error.message,stack:error.stack});
    await writeFile(join(output,'reported-result.json'),JSON.stringify({status:'failed',passed:false,error:error.message}),{flush:true});
  } catch(persistenceError) { console.error('Fixture evidence failure:',persistenceError.stack ?? persistenceError.message); }
} finally { await fd.close(); }
