import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: true,
    manifest: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: { iframe: 'index.html', embed: 'src/embed.ts' },
      output: {
        entryFileNames: ({ name }) => name === 'embed' ? 'embed.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: ({ names }) => names.includes('embed.css') ? 'embed.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
