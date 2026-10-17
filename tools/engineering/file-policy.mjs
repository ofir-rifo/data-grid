import { execFileSync } from 'node:child_process';

const generated = new Set([
  'node_modules',
  '.git',
  '.nx',
  'dist',
  'out-tsc',
  'coverage',
  'test-output',
]);
const vendored = ['.agents/', '.github/skills/'];

export function authoredFile(path) {
  const normalized = path.replaceAll('\\', '/');
  return (
    !normalized.split('/').some((part) => generated.has(part)) &&
    !vendored.some((prefix) => normalized.startsWith(prefix))
  );
}

export function repositoryFiles(cwd = process.cwd()) {
  return [
    ...new Set(
      execFileSync(
        'git',
        ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        {
          cwd,
          encoding: 'utf8',
        },
      )
        .split('\0')
        .filter(Boolean),
    ),
  ]
    .filter(authoredFile)
    .sort();
}

// The linked Nx global scaffold is comment-only. Preserve its HTML contract for
// this policy-only change; growth is forbidden and migration is documented.
export const legacyGlobalStyle = 'apps/playground/src/styles.scss';

export function stylePathError(path, contents = '') {
  if (!authoredFile(path) || !/\.(css|scss)$/i.test(path)) return null;
  if (
    path === legacyGlobalStyle &&
    !contents.replace(/\/\*[\s\S]*?\*\//g, '').trim()
  )
    return null;
  return path.endsWith('.module.scss')
    ? null
    : `${path}: authored styles must use .module.scss`;
}
