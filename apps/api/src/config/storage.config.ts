import { registerAs } from '@nestjs/config';
export const storageConfig = registerAs('storage', () => ({
  publicUrl: process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:3001/api/v1/files',
  provider: process.env.STORAGE_PROVIDER ?? 'local',
  localPath: process.env.STORAGE_LOCAL_PATH ?? '.data/uploads',
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION,
  endpoint: process.env.STORAGE_ENDPOINT,
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  maxFileSizeBytes: Number(process.env.STORAGE_MAX_FILE_SIZE_BYTES ?? 52_428_800),
}));
