import { registerAs } from '@nestjs/config';
export const storageConfig = registerAs('storage', () => ({ publicUrl: process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:3001/files' }));
