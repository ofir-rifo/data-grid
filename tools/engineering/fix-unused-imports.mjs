import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { ESLint } from 'eslint';
import { repositoryFiles } from './file-policy.mjs';

// Only `import type` declarations are provably free of runtime side effects.
// Runtime imports stay diagnostic-only until a developer reviews module effects.
export function removeUnusedTypeImports(text, messages) {
  const source = ts.createSourceFile(
    'source.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = source.statements.filter(
    (node) => ts.isImportDeclaration(node) && node.importClause?.isTypeOnly,
  );
  const fixes = messages
    .filter((message) => {
      if (message.ruleId !== 'unused-imports/no-unused-imports' || !message.fix)
        return false;
      const position = source.getPositionOfLineAndCharacter(
        message.line - 1,
        message.column - 1,
      );
      return imports.some(
        (node) => position >= node.getStart(source) && position < node.end,
      );
    })
    .map((message) => message.fix)
    .sort((a, b) => a.range[0] - b.range[0]);
  let end = -1;
  const disjoint = fixes.filter((fix) => {
    if (fix.range[0] <= end) return false;
    end = fix.range[1];
    return true;
  });
  return disjoint
    .reverse()
    .reduce(
      (output, fix) =>
        output.slice(0, fix.range[0]) + fix.text + output.slice(fix.range[1]),
      text,
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const paths = process.argv.slice(2);
  if (!paths.length)
    throw new Error(
      'Provide explicit repository-relative TypeScript paths; no glob or bulk fixing.',
    );
  const inventory = new Set(repositoryFiles());
  const eslint = new ESLint({
    fix: false,
    flags: ['v10_config_lookup_from_file'],
  });
  for (const path of paths) {
    if (!inventory.has(path) || !/\.(ts|tsx|mts|cts)$/.test(path))
      throw new Error(`Not an authored TypeScript file: ${path}`);
    const text = readFileSync(path, 'utf8');
    const [result] = await eslint.lintText(text, { filePath: resolve(path) });
    const updated = removeUnusedTypeImports(text, result.messages);
    if (updated !== text) writeFileSync(path, updated);
    console.log(
      `${path}: ${updated === text ? 'unchanged' : 'removed unused type-only imports; review diff'}`,
    );
  }
}
