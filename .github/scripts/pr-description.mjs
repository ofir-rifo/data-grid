import { sections } from './pr-description-policy.mjs';

// Retain code as section content while shielding it from heading recognition.
export function parseSections(body) {
  const result = [];
  let fence;
  for (const line of body.replace(/<!--[^]*?(?:-->|$)/g, '').split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      result.at(-1)?.lines.push(line);
      continue;
    }
    if (marker && !(marker[1][0] === '`' && marker[2].includes('`'))) {
      fence = marker[1];
      result.at(-1)?.lines.push(line);
      continue;
    }
    const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading && (heading[1].length <= 2 || sections.some(({ name }) => name.toLowerCase() === heading[2].toLowerCase()))) {
      result.push({ name: heading[2], exact: line === `## ${heading[2]}`, lines: [] });
    } else result.at(-1)?.lines.push(line);
  }
  return result;
}

function plain(value) {
  return value.replace(/[`*_>#[\]{}()~-]/g, '').trim();
}

function substantive(value) {
  const text = plain(value).replace(/[.!:;\s]+$/g, '');
  return /[\p{L}\p{N}]/u.test(text) && !/^(?:none(?: identified)?|n\/?a|not applicable|todo|tbd|tba|fixme|coming soon|pending|test|check|reason|explanation|\.\.\.)$/i.test(text);
}

function placeholder(value) {
  return value.split('\n').some((line) => /^(?:todo|tbd|tba|fixme)(?:\b|:)|^(?:fill (?:this|in)|describe (?:the|your)|replace (?:this|every)|insert (?:text|description)|add (?:a |your )?description)\b|^(?:coming soon|pending)[.!: ]*$/i.test(plain(line)));
}

export function validateBody(body) {
  if (typeof body !== 'string' || !body.trim()) return ['Description: provide a nonempty PR body containing all five required sections.'];
  const parsed = parseSections(body);
  const errors = [];
  const names = sections.map(({ name }) => name);
  for (const section of parsed) {
    if (!names.includes(section.name) || !section.exact) errors.push(`Heading "${section.name}": use exact canonical H2 spelling and level; no extra H2 sections.`);
  }
  for (const name of names) {
    const found = parsed.filter((section) => section.name === name && section.exact);
    if (found.length !== 1) {
      errors.push(`${name}: expected exactly one canonical H2 heading; found ${found.length}.`);
      continue;
    }
    const content = found[0].lines.join('\n').trim();
    if (placeholder(content) || !/[\p{L}\p{N}]/u.test(plain(content))) {
      errors.push(`${name}: replace empty or placeholder content with meaningful information.`);
      continue;
    }
    if (['Summary', 'Changes'].includes(name) && !substantive(content)) errors.push(`${name}: describe the actual change; None/Not applicable is insufficient.`);
    if (name === 'Tests and Verification') {
      const entries = content.split(/\n(?=\s*(?:[-*+] |\d+[.)] )?\**(?:PASS|FAIL|NOT RUN)\b)/);
      let count = 0;
      for (const entry of entries) {
        const match = /^\s*(?:[-*+] |\d+[.)] )?\**(PASS|FAIL|NOT RUN)\**:\**\s*([^]*)$/.exec(entry);
        if (!match) { errors.push(`${name}: use PASS:, FAIL: or NOT RUN: for each check.`); continue; }
        count++;
        const parts = match[2].split(/\s+[—–-]\s+|:\s+/);
        if (!substantive(parts[0]) || (match[1] !== 'PASS' && (parts.length < 2 || !substantive(parts.slice(1).join(' '))))) errors.push(`${name}: ${match[1]} requires a named check${match[1] === 'PASS' ? '' : ' and a reason separated by —, - or : '}.`);
      }
      if (!count) errors.push(`${name}: report at least one check with an explicit status.`);
    }
    if (name === 'Risks and Limitations' && !/^none identified[.!]?$/i.test(plain(content)) && !substantive(content.replace(/^not applicable\s*[:—-]\s*/i, ''))) errors.push(`${name}: explain limitations or justify Not applicable.`);
    if (name === 'Related Issues / Specifications' && !/(?:https?:\/\/\S+|#\d+|(?:specs|docs)\/\S+\.md)/.test(content) && !(/^not applicable\s*[:—-]\s*/i.test(content) && substantive(content.replace(/^not applicable\s*[:—-]\s*/i, '')))) errors.push(`${name}: provide a reference or Not applicable: meaningful explanation.`);
  }
  if (parsed.filter(({ exact, name }) => exact && names.includes(name)).map(({ name }) => name).join('|') !== names.join('|')) errors.push('Description: required sections must appear once in canonical order.');
  return errors;
}

export function validateEvent(event) {
  if (!event || typeof event !== 'object' || !event.pull_request || typeof event.pull_request !== 'object') return ['Event: expected a pull_request object; cannot validate reliably.'];
  return validateBody(event.pull_request.body);
}
