import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sections, renderTemplate } from './pr-description-policy.mjs';
import { validateBody, validateEvent } from './pr-description.mjs';

const contents = ['Enforce consistent pull request descriptions.', 'Add a dependency-free policy validator.', 'PASS: policy regression suite\nNOT RUN: browser checks — documentation tooling scope excludes browsers.', 'Performance is unverified; existing HOLD remains.', 'specs/pr-description-policy.md'];
function body(overrides = {}) {
  return sections.map(({ name }, index) => `## ${name}\n\n${overrides[name] ?? contents[index]}\n`).join('\n');
}
const valid = body();
function invalid(value, diagnostic) {
  const errors = validateBody(value);
  assert.ok(errors.length, 'expected rejection');
  if (diagnostic) assert.ok(errors.some((error) => error.includes(diagnostic)), JSON.stringify(errors));
}

for (const value of [null, undefined, '', ' \n\t', 1, false, [], {}, ['text']]) test(`reject input ${JSON.stringify(value)}`, () => invalid(value, 'Description'));
test('all canonical sections and mixed statuses pass', () => assert.deepEqual(validateBody(valid), []));
for (const { name } of sections) {
  test(`missing ${name}`, () => invalid(valid.replace(`## ${name}`, 'ordinary text'), name));
  test(`empty ${name}`, () => invalid(body({ [name]: ' ' }), name));
  test(`comment-only ${name}`, () => invalid(body({ [name]: '<!-- invisible -->' }), name));
  for (const placeholder of ['TODO', 'TBD', 'FIXME: later', 'Coming soon', 'Describe the purpose and problem solved.', '- TODO: write content']) test(`${name}: reject ${placeholder}`, () => invalid(body({ [name]: placeholder }), name));
}
test('capitalization', () => invalid(valid.replace('## Summary', '## summary'), 'Summary'));
for (const level of ['#', '###', '####']) test(`heading level ${level}`, () => invalid(valid.replace('## Summary', `${level} Summary`), 'Summary'));
test('duplicate', () => invalid(`${valid}\n## Summary\nRepeated purpose.`, 'Summary'));
test('order', () => invalid(valid.replace('## Summary', '## Changes').replace('## Changes\n\nAdd', '## Summary\n\nAdd'), 'order'));
test('renamed and additional H2', () => invalid(`${valid}\n## Extra\nContent.`, 'Extra'));
for (const value of ['None', 'Not applicable', 'N/A', '***']) test(`summary refuses ${value}`, () => invalid(body({ Summary: value }), 'Summary'));
test('ordinary prose mentioning TODO is accepted', () => assert.deepEqual(validateBody(body({ Changes: 'Reject TODO-only descriptions in the new validator.' })), []));
test('mixed prose and placeholder rejected', () => invalid(body({ Changes: 'Implement validator.\nTODO: finish tests' }), 'Changes'));
test('multiline links, unicode, symbols, subsections and CRLF', () => assert.deepEqual(validateBody(body({ Changes: '### Parser\n- Preserve café & <angle> symbols.\n- See [policy](https://example.com/policy).\n\nAdditional detail.' }).replaceAll('\n', '\r\n')), []));
for (const fence of ['```', '~~~~']) test(`fenced headings ${fence}`, () => assert.deepEqual(validateBody(body({ Changes: `Implement heading shielding.\n${fence}md\n## Summary\n## Changes\n${fence}\nContinue prose.` })), []));
test('longer fence ignores shorter closing marker', () => assert.deepEqual(validateBody(body({ Changes: 'Add parser.\n````md\n```\n## Summary\n````' })), []));
test('comment headings ignored', () => assert.deepEqual(validateBody(`${valid}\n<!--\n## Summary\n-->`), []));
for (const status of ['PASS: regression suite', '- **PASS:** regression suite', '**PASS**: regression suite', 'FAIL: regression suite — fixture mismatch', 'NOT RUN: browser suite - prohibited workload']) test(status, () => assert.deepEqual(validateBody(body({ 'Tests and Verification': status })), []));
for (const status of ['NOT RUN: browsers', 'FAIL: suite', 'NOT RUN: browsers — TODO', 'PASS:', 'tests passed', 'PASS: check', 'NOT RUN: suite — reason']) test(`reject ${status}`, () => invalid(body({ 'Tests and Verification': status }), 'Tests and Verification'));
test('wrapped verification entry', () => assert.deepEqual(validateBody(body({ 'Tests and Verification': 'NOT RUN: browser tests — prohibited by\n  the approved safety scope.' })), []));
for (const risk of ['None identified', 'Not applicable: no runtime code changes.', 'Fork execution awaits maintainer approval.']) test(risk, () => assert.deepEqual(validateBody(body({ 'Risks and Limitations': risk })), []));
test('bare risks Not applicable rejected', () => invalid(body({ 'Risks and Limitations': 'Not applicable' }), 'Risks and Limitations'));
for (const ref of ['Not applicable: standalone tooling policy without a related issue.', '#4 and #5', '[Specification](https://example.com/spec)', 'docs/ENGINEERING-STANDARDS.md']) test(ref, () => assert.deepEqual(validateBody(body({ 'Related Issues / Specifications': ref })), []));
test('bare reference Not applicable rejected', () => invalid(body({ 'Related Issues / Specifications': 'Not applicable' }), 'Related Issues / Specifications'));
test('draft and regular event equivalence', () => {
  for (const draft of [true, false]) {
    assert.deepEqual(validateEvent({ pull_request: { draft, body: valid } }), []);
    assert.ok(validateEvent({ pull_request: { draft, body: null } }).length);
  }
});
test('malformed event fails closed', () => {
  for (const event of [null, {}, { pull_request: null }, { pull_request: [] }]) assert.ok(validateEvent(event).length);
});
test('template generated exactly and intentionally invalid until completed', () => {
  assert.equal(readFileSync(new URL('../pull_request_template.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n'), renderTemplate());
  invalid(renderTemplate(), 'Summary');
});
test('CLI reads actual event body and fails closed', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pr-policy-'));
  const path = join(directory, 'event.json');
  try {
    for (const [event, expected] of [[{ pull_request: { body: valid }, title: 'TODO' }, 0], [{ pull_request: { body: null }, body: valid }, 1], [{}, 1]]) {
      writeFileSync(path, JSON.stringify(event));
      const result = spawnSync(process.execPath, [new URL('./check-pr-description.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], { env: { ...process.env, GITHUB_EVENT_PATH: path }, encoding: 'utf8', timeout: 5000 });
      assert.equal(result.status, expected, result.stderr);
    }
    writeFileSync(path, '{broken');
    const result = spawnSync(process.execPath, ['.github/scripts/check-pr-description.mjs'], { env: { ...process.env, GITHUB_EVENT_PATH: path }, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot validate/);
    const missing = spawnSync(process.execPath, ['.github/scripts/check-pr-description.mjs'], { env: { ...process.env, GITHUB_EVENT_PATH: '' }, encoding: 'utf8', timeout: 5000 });
    assert.equal(missing.status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('workflow static security and trigger contract', () => {
  const workflow = readFileSync(new URL('../workflows/pr-description.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.match(workflow, /types: \[opened, edited, reopened, synchronize, ready_for_review, converted_to_draft\]/);
  assert.match(workflow, /  pull_request_target:\n    branches: \[main\]/);
  assert.match(workflow, /permissions:\n  contents: read\n  pull-requests: read\n  statuses: write\n/);
  assert.match(workflow, /name: Trusted description reporter\n/);
  assert.match(workflow, /ref: \$\{\{ github.workflow_sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /run: node \.github\/scripts\/report-pr-description\.mjs/);
  assert.doesNotMatch(workflow, /  pull_request:|secrets[.[]|\bif:|paths:|pnpm|npm install|github\.event\.pull_request\.(?:body|head|base)|refs\/pull/);
  assert.equal([...workflow.matchAll(/^\s+- uses: /gm)].length, 2);
  for (const use of workflow.matchAll(/^\s+- uses: (.+)/gm)) assert.match(use[1], /@[a-f0-9]{40} /);
});
