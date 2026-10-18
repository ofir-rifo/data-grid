import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import styleConfig from '../../stylelint.config.mjs';
import { engineeringConfig, typedConfig } from './eslint-policy.mjs';
import {
  authoredFile,
  repositoryFiles,
  stylePathError,
  legacyGlobalStyle,
} from './file-policy.mjs';
import { removeUnusedTypeImports } from './fix-unused-imports.mjs';

const fixture = mkdtempSync(join(tmpdir(), 'datagrid-standards-'));
after(() => rmSync(fixture, { recursive: true, force: true }));
const eslint = new ESLint({
  cwd: fixture,
  overrideConfigFile: true,
  overrideConfig: engineeringConfig,
});
const lint = async (code, filePath = 'apps/playground/src/orphan.ts') =>
  (await eslint.lintText(code, { filePath }))[0];
const ruleIds = (result) => result.messages.map((message) => message.ruleId);

test('real root and nested playground configs enforce policy on unimported source paths', async () => {
  const workspace = new ESLint({ flags: ['v10_config_lookup_from_file'] });
  const library = await workspace.calculateConfigForFile(
    'packages/grid-core/src/unimported.ts',
  );
  assert.equal(library.rules['unused-imports/no-unused-imports'][0], 2);
  assert.equal(library.rules['@typescript-eslint/no-explicit-any'][0], 2);
  assert.equal(library.rules['no-restricted-properties'][0], 2);
  assert.equal(library.rules['@typescript-eslint/no-floating-promises'][0], 2);
  assert.equal(library.languageOptions.parserOptions.projectService, true);
  const app = await workspace.calculateConfigForFile(
    'apps/playground/src/unimported.ts',
  );
  assert.equal(app.rules['@typescript-eslint/no-floating-promises'][0], 2);
  assert.equal(app.rules['unused-imports/no-unused-vars'][0], 2);
  const browserTest = await workspace.calculateConfigForFile(
    'apps/playground/e2e/unimported.spec.ts',
  );
  assert.ok(browserTest.rules['playwright/no-conditional-in-test'][0] > 0);
  assert.equal(
    browserTest.rules['@typescript-eslint/no-misused-promises'][0],
    2,
  );
});

test('valid TypeScript is accepted; unused imports and bindings fail independently', async () => {
  assert.equal((await lint('export const count: number = 1;')).errorCount, 0);
  const result = await lint(
    "import type { Unknown } from './types'; const unused = 1; export const used = 2;",
  );
  assert.ok(ruleIds(result).includes('unused-imports/no-unused-imports'));
  assert.ok(ruleIds(result).includes('unused-imports/no-unused-vars'));
  assert.ok(
    ruleIds(await lint('const _unused = 1; export {};')).includes(
      'unused-imports/no-unused-vars',
    ),
  );
  assert.equal(
    (
      await lint(
        'export const label = (_value: unknown, index: number) => index;',
      )
    ).errorCount,
    0,
  );
  assert.ok(
    ruleIds(
      await lint('export const label = (_value: number) => _value;'),
    ).includes('unused-imports/no-unused-vars'),
  );
});

test('empty functions/methods, unreachable code, debugger and explicit any fail', async () => {
  for (const code of [
    'export function empty() {}',
    'export class Empty { method() {} }',
  ]) {
    assert.ok(
      ruleIds(await lint(code)).includes(
        '@typescript-eslint/no-empty-function',
      ),
    );
  }
  assert.ok(
    ruleIds(await lint('export function empty() { /* TODO */ }')).includes(
      'no-restricted-syntax',
    ),
  );
  assert.equal(
    (await lint('export class Value { constructor(public value: number) {} }'))
      .errorCount,
    0,
  );
  assert.ok(
    ruleIds(
      await lint('export function answer() { return 1; debugger; }'),
    ).includes('no-unreachable'),
  );
  assert.ok(
    ruleIds(await lint('debugger; export {};')).includes('no-debugger'),
  );
  assert.ok(
    ruleIds(await lint('export const value: any = 1;')).includes(
      '@typescript-eslint/no-explicit-any',
    ),
  );
});

test('unsafe TS suppressions fail; explained negative type tests are permitted only in tests', async () => {
  for (const directive of ['@ts-ignore', '@ts-nocheck', '@ts-expect-error']) {
    assert.ok(
      ruleIds(await lint(`// ${directive}\nexport const value = 1;`)).includes(
        '@typescript-eslint/ban-ts-comment',
      ),
    );
  }
  assert.ok(
    ruleIds(
      await lint(
        '// @ts-expect-error\nexport const value = 1;',
        'apps/playground/src/example.spec.ts',
      ),
    ).includes('@typescript-eslint/ban-ts-comment'),
  );
  assert.equal(
    (
      await lint(
        '// @ts-expect-error -- intentionally invalid input contract\nexport const value: number = "bad";',
        'apps/playground/src/example.spec.ts',
      )
    ).errorCount,
    0,
  );
});

test('production library logging is rejected, including computed access and destructuring; tests may log', async () => {
  for (const expression of [
    'console.log("x")',
    'console.debug("x")',
    'console.info("x")',
    'console["log"]("x")',
    'const { log } = console; log("x")',
  ]) {
    assert.ok(
      ruleIds(
        await lint(
          `${expression}; export {};`,
          'packages/grid-core/src/orphan.ts',
        ),
      ).includes('no-restricted-properties'),
    );
  }
  assert.equal(
    (
      await lint(
        'console.warn("x"); export {};',
        'packages/grid-core/src/orphan.ts',
      )
    ).errorCount,
    0,
  );
  assert.equal(
    (
      await lint(
        'console.log("diagnostic"); export {};',
        'packages/grid-core/src/orphan.spec.ts',
      )
    ).errorCount,
    0,
  );
});

test('safe autofix removes only type imports, preserving runtime module evaluation, bare imports and variables', async () => {
  const text =
    "import type { Unknown } from './types';\nimport { runtime } from './effects';\nimport './register';\nconst unused = 1;\nexport const value = 2;\n";
  const result = await lint(text);
  const fixed = removeUnusedTypeImports(text, result.messages);
  assert.ok(!fixed.includes('import type'));
  assert.ok(fixed.includes("import { runtime } from './effects'"));
  assert.ok(fixed.includes("import './register'"));
  assert.ok(fixed.includes('const unused = 1'));
  assert.ok(
    ruleIds(await lint(fixed)).includes('unused-imports/no-unused-imports'),
  );
});

test('type-aware rules reject unhandled/misused promises and invalid await in an unimported library file', async () => {
  const directory = join(fixture, 'packages/grid-core');
  mkdirSync(join(directory, 'src'), { recursive: true });
  writeFileSync(
    join(directory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext' },
      include: ['src/**/*.ts'],
    }),
  );
  const path = join(directory, 'src/orphan.ts');
  writeFileSync(
    path,
    'Promise.resolve(1);\nvoid Promise.resolve(2);\ndeclare function acceptsVoid(callback: () => void): void;\nacceptsVoid(async () => { await Promise.resolve(1); });\nexport async function invalid() { await 1; }\n',
  );
  const validPath = join(directory, 'src/valid.ts');
  writeFileSync(
    validPath,
    'export async function valid() { await Promise.resolve(1); }\nPromise.resolve(1).catch(() => undefined);\n',
  );
  const typed = new ESLint({
    cwd: fixture,
    overrideConfigFile: true,
    overrideConfig: [
      ...engineeringConfig,
      {
        ...typedConfig,
        languageOptions: {
          parserOptions: { projectService: true, tsconfigRootDir: fixture },
        },
      },
    ],
  });
  const [result] = await typed.lintFiles([path]);
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  assert.equal(
    result.messages.filter(
      ({ ruleId }) => ruleId === '@typescript-eslint/no-floating-promises',
    ).length,
    2,
  );
  assert.ok(ruleIds(result).includes('@typescript-eslint/no-misused-promises'));
  assert.ok(ruleIds(result).includes('@typescript-eslint/await-thenable'));
  const [valid] = await typed.lintFiles([validPath]);
  assert.equal(valid.errorCount, 0, JSON.stringify(valid.messages));
});

test('filesystem inventory catches unimported forbidden styles and excludes dependencies/generated output', () => {
  execFileSync('git', ['init', '-q'], { cwd: fixture });
  const paths = [
    'orphan.css',
    'orphan.module.css',
    'orphan.scss',
    'orphan.module.scss',
    'dist/generated.css',
    'node_modules/dependency.css',
  ];
  for (const path of paths) {
    mkdirSync(join(fixture, path, '..'), { recursive: true });
    writeFileSync(join(fixture, path), '.cell { color: red; }');
  }
  const files = repositoryFiles(fixture);
  for (const path of paths.slice(0, 4)) assert.ok(files.includes(path));
  for (const path of paths.slice(0, 3)) assert.ok(stylePathError(path));
  assert.equal(stylePathError('orphan.module.scss'), null);
  assert.equal(stylePathError(legacyGlobalStyle, '/* scaffold only */'), null);
  assert.ok(stylePathError(legacyGlobalStyle, 'body { margin: 0; }'));
  assert.equal(files.includes('dist/generated.css'), false);
  assert.equal(
    authoredFile('packages/test/node_modules/dependency.css'),
    false,
  );
});

test('Stylelint accepts SCSS Modules and rejects empty blocks, duplicates and important even with disables', async () => {
  const lintStyle = async (code) =>
    stylelint.lint({
      code,
      codeFilename: join(process.cwd(), 'orphan.module.scss'),
      config: styleConfig,
    });
  assert.equal(
    (
      await lintStyle(
        '$space: 4px; .cell { padding: $space; &:hover { color: red; } }',
      )
    ).errored,
    false,
  );
  for (const [code, rule] of [
    ['.cell {}', 'block-no-empty'],
    ['.cell { /* placeholder */ }', 'block-no-empty'],
    [
      '.cell { color: red; color: blue; }',
      'declaration-block-no-duplicate-properties',
    ],
    [
      '.cell { --tone: red; --tone: blue; }',
      'declaration-block-no-duplicate-custom-properties',
    ],
    [
      '/* stylelint-disable declaration-no-important */ .cell { color: red !important; }',
      'declaration-no-important',
    ],
  ]) {
    const result = await lintStyle(code);
    assert.ok(result.errored, code);
    assert.ok(
      result.results[0].warnings.some((warning) => warning.rule === rule),
      code,
    );
  }
});
