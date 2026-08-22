import { registerAs } from '@nestjs/config';
export const integrationsConfig = registerAs('integrations', () => ({
  webhookBaseUrl: process.env.INTEGRATIONS_WEBHOOK_BASE_URL,
  meta: {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    graphApiVersion: process.env.META_GRAPH_API_VERSION?.trim() || 'v23.0',
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    redirectUri: process.env.META_REDIRECT_URI,
  },
  highlevel: {
    clientId: process.env.HIGHLEVEL_CLIENT_ID,
    clientSecret: process.env.HIGHLEVEL_CLIENT_SECRET,
    redirectUri: process.env.HIGHLEVEL_REDIRECT_URI,
    webhookPublicKey: process.env.HIGHLEVEL_WEBHOOK_PUBLIC_KEY,
    apiBaseUrl: process.env.HIGHLEVEL_API_BASE_URL?.trim() || 'https://services.leadconnectorhq.com',
  },
}));
