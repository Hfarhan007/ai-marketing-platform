import config from '@repo/eslint-config';

export default [
  { ignores: ['eslint.config.js'] },
  ...config,
  {
    files: ['**/*.spec.ts', 'test/**/*.ts', 'vitest.*.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.spec.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
