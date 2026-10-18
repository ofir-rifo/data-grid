import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { prCommits, validate, validHeader } from './check-conventions.mjs';

test('supported types, scopes and breaking-change markers', () => {
  for (const type of [
    'feat',
    'fix',
    'perf',
    'refactor',
    'test',
    'docs',
    'build',
    'ci',
    'chore',
    'revert',
  ]) {
    assert.ok(validHeader(`${type}: change`));
    assert.ok(validHeader(`${type}(playground): change`));
    assert.ok(validHeader(`${type}(core)!: change`));
  }
  for (const value of [
    'change',
    'feature: change',
    'fix: ',
    'fix:  change',
    'fix(): change',
    'fix: change\nextra',
    ' fix: change',
    'fix: change ',
  ]) {
    assert.equal(validHeader(value), false, value);
  }
});

test('invalid earlier commit cannot be hidden by a valid final commit', () => {
  assert.throws(
    () =>
      validate('ci: checks', [
        { sha: 'earlier', subject: 'bad message' },
        { sha: 'latest', subject: 'ci: checks' },
      ]),
    /earlier/,
  );
  assert.throws(
    () => validate('bad title', [{ sha: 'one', subject: 'fix: valid' }]),
    /PR title/,
  );
});

test('Git range includes every branch commit but excludes base and synthetic merge', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'datagrid-conventions-'));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    }).trim();
  try {
    git('init', '-q');
    git('commit', '--allow-empty', '-qm', 'legacy base');
    const base = git('rev-parse', 'HEAD');
    git('checkout', '-qb', 'feature');
    git('commit', '--allow-empty', '-qm', 'ci: first');
    git('commit', '--allow-empty', '-qm', 'test(ci): second');
    const head = git('rev-parse', 'HEAD');
    git('checkout', '-qb', 'integration', base);
    git('merge', '--no-ff', '-qm', 'synthetic merge', head);
    const commits = prCommits(base, head, cwd);
    assert.deepEqual(
      commits.map(({ subject }) => subject),
      ['ci: first', 'test(ci): second'],
    );
    validate('ci: foundation', commits);
    assert.throws(() => prCommits(base, base, cwd), /No PR commits/);
    assert.throws(() => prCommits('--bad', head, cwd), /Invalid PR SHA/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
