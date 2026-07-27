import { registerAs } from '@nestjs/config';
export const integrationsConfig = registerAs('integrations', () => ({ webhookBaseUrl: process.env.INTEGRATIONS_WEBHOOK_BASE_URL }));
