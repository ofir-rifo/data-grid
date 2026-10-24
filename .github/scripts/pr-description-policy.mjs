export const sections = Object.freeze([
  { name: 'Summary', prompt: 'Describe the purpose and problem solved.' },
  { name: 'Changes', prompt: 'Describe the major implementation and architecture changes.' },
  { name: 'Tests and Verification', prompt: 'Report each check as PASS: check; FAIL: check — reason; or NOT RUN: check — reason. Never claim an unexecuted check passed.' },
  { name: 'Risks and Limitations', prompt: 'Describe risks, limitations and unverified behavior. Use None identified only when justified, or Not applicable: explanation.' },
  { name: 'Related Issues / Specifications', prompt: 'Link relevant issues, PRs or repository specifications, or write Not applicable: explanation.' },
].map(Object.freeze));

export function renderTemplate() {
  return '<!-- Generated from .github/scripts/pr-description-policy.mjs. Replace every TODO and follow the instructions; comments alone do not count. -->\n\n' +
    sections.map(({ name, prompt }) => `## ${name}\n\n<!-- ${prompt} -->\nTODO\n`).join('\n');
}
