import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { resolveAlias } from './vite.aliases';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: resolveAlias },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: './src/test/setup.ts',
  },
});
