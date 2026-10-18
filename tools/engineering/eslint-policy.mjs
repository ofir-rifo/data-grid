import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export const sourceFiles = ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'];
const typescriptFiles = ['**/*.{ts,tsx,mts,cts}'];
const testFiles = [
  '**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  '**/e2e/**',
];

// Shared by the real workspace config and isolated positive/negative policy tests.
export const engineeringConfig = [
  {
    files: sourceFiles,
    plugins: { 'unused-imports': unusedImports },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          argsIgnorePattern: '^_',
          reportUsedIgnorePattern: true,
          caughtErrors: 'all',
          ignoreRestSiblings: false,
        },
      ],
      'no-empty-function': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            ':matches(FunctionDeclaration,FunctionExpression,ArrowFunctionExpression)[body.type="BlockStatement"][body.body.length=0]:not(:has(TSParameterProperty))',
          message:
            'Empty implementations, including comment-only bodies, are forbidden. Implement the contract or throw a meaningful error.',
        },
      ],
      'no-unreachable': 'error',
      'no-debugger': 'error',
    },
  },
  {
    files: typescriptFiles,
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': ['error', { allow: [] }],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': true,
        },
      ],
    },
  },
  {
    files: [
      '**/*.{test,spec}.{ts,tsx,mts,cts}',
      '**/e2e/**/*.{ts,tsx,mts,cts}',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 15,
        },
      ],
    },
  },
  {
    files: [
      'packages/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
      'libs/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
    ],
    ignores: testFiles,
    rules: {
      'no-restricted-properties': [
        'error',
        ...['log', 'debug', 'info'].map((property) => ({
          object: 'console',
          property,
          message:
            'Production libraries must inject a diagnostic interface instead.',
        })),
      ],
    },
  },
];

export const typedConfig = {
  files: [
    'apps/*/src/**/*.{ts,tsx}',
    'apps/*/e2e/**/*.ts',
    'packages/**/*.{ts,tsx,mts,cts}',
    'libs/**/*.{ts,tsx,mts,cts}',
  ],
  languageOptions: { parserOptions: { projectService: true } },
  rules: {
    '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
  },
};
