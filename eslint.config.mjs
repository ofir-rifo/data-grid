import nx from '@nx/eslint-plugin';
import {
  engineeringConfig,
  typedConfig,
} from './tools/engineering/eslint-policy.mjs';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '**/test-output',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  ...engineeringConfig.map((config) => ({
    ...config,
    basePath: import.meta.dirname,
  })),
  {
    ...typedConfig,
    basePath: import.meta.dirname,
    languageOptions: {
      parserOptions: {
        ...typedConfig.languageOptions.parserOptions,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
