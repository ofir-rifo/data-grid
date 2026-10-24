import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { githubClient, reportDescription } from './pr-description-reporter.mjs';

try {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is required.');
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const result = await reportDescription({
    event,
    env: process.env,
    request: githubClient(process.env.GH_TOKEN),
    verifyPolicy() {
      const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 5000 }).trim();
      if (head !== process.env.GITHUB_WORKFLOW_SHA) throw new Error('Checkout does not match the trusted workflow SHA.');
      const testEnv = { ...process.env };
      delete testEnv.GH_TOKEN;
      delete testEnv.GITHUB_TOKEN;
      const tests = spawnSync(process.execPath, [
        '--test', '--test-concurrency=1',
        fileURLToPath(new URL('./pr-description.test.mjs', import.meta.url)),
        fileURLToPath(new URL('./pr-description-reporter.test.mjs', import.meta.url)),
      ], { env: testEnv, stdio: 'inherit', timeout: 30000 });
      if (tests.error || tests.status !== 0) throw new Error('Trusted policy/security regression gates failed or timed out.');
    },
  });
  for (const error of result.errors) console.error(JSON.stringify(error));
  if (!result.valid) process.exitCode = 1;
  else console.log('Trusted policy validated the current PR body and published its head status.');
} catch (error) {
  console.error(JSON.stringify(`Trusted PR description validation failed: ${error.message}`));
  process.exitCode = 1;
}
