import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import { repositoryFiles, stylePathError } from './file-policy.mjs';

const files = repositoryFiles();
const styles = files.filter((path) => /\.(css|scss)$/i.test(path));
const pathErrors = styles
  .map((path) => stylePathError(path, readFileSync(path, 'utf8')))
  .filter(Boolean);
for (const error of pathErrors) console.error(error);

// ESLint 9's supported forward-compatibility flag preserves each project's
// nearest flat config (React/Playwright included) in a root-wide inventory run.
const eslint = new ESLint({ flags: ['v10_config_lookup_from_file'] });
const sources = files.filter((path) =>
  /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(path),
);
const results = await eslint.lintFiles(sources);
console.log((await eslint.loadFormatter('stylish')).format(results));

const styleResult = styles.length
  ? await stylelint.lint({ files: styles, formatter: 'string' })
  : null;
if (styleResult?.report) console.log(styleResult.report);
const errors = results.reduce((count, result) => count + result.errorCount, 0);
console.log(
  `Standards inventory: ${sources.length} source files, ${styles.length} style files (including unimported files).`,
);
process.exitCode = pathErrors.length || errors || styleResult?.errored ? 1 : 0;
