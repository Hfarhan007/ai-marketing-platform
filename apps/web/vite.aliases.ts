import { fileURLToPath, URL } from 'node:url';

export const resolveAlias = {
  '@/app': fileURLToPath(new URL('./src/app', import.meta.url)),
  '@/assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
  '@/layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
  '@/shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
  '@/features': fileURLToPath(new URL('./src/features', import.meta.url)),
  '@/mocks': fileURLToPath(new URL('./src/mocks', import.meta.url)),
};
