import { validateBody } from './pr-description.mjs';

export const repository = 'ofir-rifo/data-grid';
export const statusContext = 'PR description';
const api = `https://api.github.com/repos/${repository}`;
const shaPattern = /^[a-f0-9]{40}$/;
const actions = ['opened', 'edited', 'reopened', 'synchronize', 'ready_for_review', 'converted_to_draft'];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function trustedContext(event, env) {
  requireCondition(env.GITHUB_EVENT_NAME === 'pull_request_target', 'Expected pull_request_target; no PR-controlled workflow may publish this status.');
  requireCondition(env.GITHUB_REPOSITORY === repository, 'Unexpected workflow repository.');
  requireCondition(env.GITHUB_WORKFLOW_REF === `${repository}/.github/workflows/pr-description.yml@refs/heads/main`, 'Expected the trusted main workflow definition.');
  requireCondition(shaPattern.test(env.GITHUB_WORKFLOW_SHA ?? ''), 'Missing trusted workflow SHA.');
  requireCondition(env.GITHUB_SHA === env.GITHUB_WORKFLOW_SHA && env.GITHUB_REF === 'refs/heads/main', 'Workflow revision must match the default main execution context.');
  requireCondition(/^\d+$/.test(env.GITHUB_RUN_ID ?? ''), 'Invalid workflow run ID.');
  requireCondition(actions.includes(event?.action), 'Unsupported PR event action.');
  requireCondition(event?.repository?.full_name === repository && event.repository.default_branch === 'main', 'Unexpected event repository/default branch.');
  requireCondition(Number.isSafeInteger(event.number) && event.number > 0 && event.pull_request?.number === event.number, 'Invalid PR number.');
  requireCondition(event.pull_request.base?.repo?.full_name === repository && event.pull_request.base.ref === 'main', 'Only this repository main base is trusted.');
  requireCondition(shaPattern.test(event.pull_request.head?.sha ?? ''), 'Invalid event head SHA.');
  return {
    number: event.number,
    sha: event.pull_request.head.sha,
    target: `https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID}`,
  };
}

function liveSnapshot(pr, context) {
  requireCondition(pr?.number === context.number && pr.state === 'open', 'PR is missing, mismatched or no longer open.');
  requireCondition(pr.base?.repo?.full_name === repository && pr.base.ref === 'main', 'PR no longer targets the trusted main base.');
  requireCondition(pr.head?.sha === context.sha, 'Stale event head SHA; a fresh synchronize event must validate the new head.');
  requireCondition(typeof pr.updated_at === 'string' && pr.updated_at.length > 0, 'Missing PR update timestamp.');
  return JSON.stringify([pr.number, pr.state, pr.base.ref, pr.base.repo.full_name, pr.head.sha, pr.body, pr.updated_at]);
}

// request/verifyPolicy are explicit seams for deterministic tests; production
// supplies only the fixed HTTPS API client and bounded trusted local test runner.
export async function reportDescription({ event, env, request, verifyPolicy }) {
  const context = trustedContext(event, env);
  const statusUrl = `${api}/statuses/${context.sha}`;
  const prUrl = `${api}/pulls/${context.number}`;
  const publish = (state, description) => request(statusUrl, {
    method: 'POST',
    body: { state, context: statusContext, description, target_url: context.target },
  });

  try {
    await publish('pending', 'Validating trusted policy and current PR description.');
    await verifyPolicy();
    const pr = await request(prUrl);
    const snapshot = liveSnapshot(pr, context);
    const errors = validateBody(pr.body);
    if (errors.length) {
      await publish('failure', 'Description is invalid; edit the PR body. See run diagnostics.');
      return { valid: false, errors };
    }
    const current = await request(prUrl);
    requireCondition(liveSnapshot(current, context) === snapshot, 'PR changed during validation; edit the description to trigger a fresh run.');
    await publish('success', 'Current PR description meets the trusted canonical policy.');
    return { valid: true, errors: [] };
  } catch (error) {
    // Never turn an infrastructure/gate/API failure into a successful status.
    // If even this write is denied, the job fails and status may remain pending.
    try {
      await publish('error', 'Trusted validation could not complete; inspect the failed run.');
    } catch {
      throw new Error('Trusted validation/status publication failed; no success was certified. Check API permissions and the run.');
    }
    throw error;
  }
}

export function githubClient(token, fetchImpl = fetch) {
  requireCondition(typeof token === 'string' && token.length > 0, 'Missing automatic GitHub token.');
  return async (url, { method = 'GET', body } = {}) => {
    requireCondition(url.startsWith(`${api}/`) && /^(?:GET|POST)$/.test(method), 'Unexpected API destination or method.');
    const allowed = method === 'GET'
      ? /^https:\/\/api\.github\.com\/repos\/ofir-rifo\/data-grid\/pulls\/[1-9]\d*$/
      : /^https:\/\/api\.github\.com\/repos\/ofir-rifo\/data-grid\/statuses\/[a-f0-9]{40}$/;
    requireCondition(allowed.test(url), 'Unexpected API endpoint.');
    const response = await fetchImpl(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'data-grid-pr-description',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    // Do not echo response bodies, credentials or attacker-supplied API messages.
    requireCondition(response.ok, `GitHub API ${method} failed with HTTP ${response.status}.`);
    return response.json();
  };
}
