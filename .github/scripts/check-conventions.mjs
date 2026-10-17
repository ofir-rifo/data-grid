import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const header =
  /^(feat|fix|perf|refactor|test|docs|build|ci|chore|revert)(\([a-z0-9][a-z0-9._/-]*\))?!?: \S[^\r\n]*$/;

export function validHeader(value) {
  return (
    typeof value === 'string' && value === value.trim() && header.test(value)
  );
}

export function prCommits(base, head, cwd = process.cwd()) {
  for (const sha of [base, head]) {
    if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Invalid PR SHA');
  }
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const hashes = git('rev-list', '--reverse', `${base}..${head}`)
    .split('\n')
    .filter(Boolean);
  if (!hashes.length) throw new Error('No PR commits found');
  return hashes.map((sha) => ({
    sha,
    subject: execFileSync('git', ['show', '-s', '--format=%s', sha], {
      cwd,
      encoding: 'utf8',
    }).replace(/\r?\n$/, ''),
  }));
}

export function validate(title, commits) {
  const errors = [];
  if (!validHeader(title))
    errors.push(
      'PR title must use type(scope): description or type: description',
    );
  for (const { sha, subject } of commits) {
    if (!validHeader(subject))
      errors.push(`Commit ${sha} has an invalid Conventional Commit header`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const { pull_request: pr } = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'),
    );
    if (!pr) throw new Error('A pull_request event is required');
    const commits = prCommits(pr.base.sha, pr.head.sha);
    validate(pr.title, commits);
    console.log(
      `Validated PR title and all ${commits.length} PR commits (excluding synthetic merge).`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
