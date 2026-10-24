import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@org/grid-core',
    environment: 'node',
    watch: false,
    include: ['packages/grid-core/src/**/*.spec.ts'],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
