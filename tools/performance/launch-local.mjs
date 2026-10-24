import { mkdir, open, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { ownedShell } from './owned-shell.mjs';

// Explicit reviewed host: never search PATH, change policy or try another host.
const host = 'C:\\Users\\ofirr\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe';
const root = resolve(import.meta.dirname, '../..');
const mode = process.argv[2];
if (mode !== 'verify') throw new Error('Runtime HOLD: only harmless verify mode is available');
if (process.platform !== 'win32') throw new Error('Windows verification only');
const output = join(homedir(), 'Documents', 'Codex', 'datagrid-performance', `${new Date().toISOString().replace(/[:.]/g, '-')}-verify`);
await mkdir(output, { recursive: true });
const manifest = await open(join(output, 'launcher.jsonl'), 'ax');
async function record(value) {
  await manifest.write(JSON.stringify({ utc: new Date().toISOString(), ...value }) + '\n');
  await manifest.sync();
}
const script = join(root, 'tools/performance/local-supervisor.ps1');
// Absolute reviewed host, separate argument array, shell:false; no ComSpec/PATH.
const stdout = await open(join(output, 'host.stdout.log'), 'ax');
const stderr = await open(join(output, 'host.stderr.log'), 'ax');
const hashes = {};
for (const name of ['windows-job.cs', 'captured-process.cs', 'guard-verification.cs', 'local-supervisor.ps1', 'sleep-canary.mjs', 'launch-local.mjs', 'owned-shell.mjs', 'launcher-timeout-case.mjs']) {
  hashes[name] = createHash('sha256').update(await readFile(join(root, 'tools/performance', name))).digest('hex');
}
await record({ event: 'started', mode, host, output, hashes, runtimeWorkload: false, retries: 0 });
console.log(`Evidence: ${output}`);
const started = performance.now();
const launch = ownedShell(host, ['-NoProfile','-NonInteractive','-File',script,'-Mode','Verify'], {
  cwd: root, timeoutMs: 29500, onEvent: record,
  stdio: ['ignore', stdout.fd, stderr.fd],
  env: { ...process.env, GRID_PERF_VERIFY_OUTPUT: output, GRID_PERF_NODE: process.execPath },
});
// Separate outer bound includes a final 500ms for diagnostic persistence. Even a
// never-exiting child or stalled evidence write cannot retain this launcher forever.
const hardStop = setTimeout(() => {
  launch.stop('launcher-hard-deadline');
  console.error('Launcher deadline: teardown/evidence may be unconfirmed; FAIL.');
  process.exit(1);
},30000);
let childExitConfirmed=false;
let operatorAborted=false;
const onSignal = () => { operatorAborted=true; launch.stop('operator-signal'); };
process.once('SIGINT', onSignal);
process.once('SIGTERM', onSignal);
try {
  const execution = await launch.done;
  childExitConfirmed=execution.directExitConfirmed;
  await record({event:'launcher-outcome',execution,outerDeadlineMs:30000});
  const result = JSON.parse(await readFile(join(output, 'verification-result.json'), 'utf8'));
  const success = !operatorAborted && execution.exited && execution.diagnosticsConfirmed && execution.code === 0 && execution.signal === null &&
    execution.firstAbortReason === null && result.status === 'passed' && result.teardownVerified;
  await record({ event: success ? 'completed' : 'failed', execution, elapsedMs: performance.now() - started, result });
  process.exitCode = success ? 0 : 1;
} catch (error) {
  await launch.stop('launcher-error');
  await record({ event: 'failed-or-incomplete', message: error.message, elapsedMs: performance.now() - started });
  process.exitCode = 1;
} finally {
  process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal);
  await stdout.close(); await stderr.close();
  await manifest.close();
  // If exit could not be established, keep the independent failure exit armed.
  if(childExitConfirmed) clearTimeout(hardStop);
}
