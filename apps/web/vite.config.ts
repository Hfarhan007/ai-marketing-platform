import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveAlias } from './vite.aliases';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: resolveAlias },
});
