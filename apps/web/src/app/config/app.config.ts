import { APP_NAME } from '@repo/config';
import { environment } from './environment';

export const appConfig = {
  apiUrl: environment.VITE_API_URL,
  environment: environment.MODE,
  name: APP_NAME,
  supportEmail: 'support@example.com',
} as const;

export type AppConfig = typeof appConfig;
