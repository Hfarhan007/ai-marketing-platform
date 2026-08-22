# Integrations

Provider setup and operations guides:

- [Meta: Facebook and Instagram](./meta.md)
- [GoHighLevel](./highlevel.md)

## Shared architecture

Connections belong to one workspace. Authenticated management endpoints require the appropriate `integrations.read` or `integrations.manage` permission. OAuth credentials are encrypted by the API credential vault and are never returned to the web application.

Provider webhooks are the only unauthenticated integration endpoints. They validate the provider signature against the unmodified request body before persisting an idempotent event and queueing background processing. Never put credentials in frontend environment variables or browser storage.

Set `INTEGRATIONS_WEBHOOK_BASE_URL` to the externally reachable API prefix, without a trailing integration-specific path. Example:

```dotenv
INTEGRATIONS_WEBHOOK_BASE_URL=https://api.example.com/api/v1
```

Localhost cannot receive provider webhooks. Use a controlled HTTPS development tunnel and register its exact URL with the provider. Treat tunnel URLs as temporary configuration, not production settings.

