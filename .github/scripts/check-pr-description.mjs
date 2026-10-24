import { readFileSync } from 'node:fs';
import { validateEvent } from './pr-description.mjs';

try {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is required');
  const errors = validateEvent(JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')));
  // JSON escaping keeps untrusted newlines/control characters out of log commands.
  for (const error of errors) console.error(JSON.stringify(error));
  if (errors.length) process.exitCode = 1;
  else console.log('PR description passed. Human review must verify accuracy.');
} catch (error) {
  console.error(JSON.stringify(`Cannot validate PR description: ${error.message}`));
  process.exitCode = 1;
}
