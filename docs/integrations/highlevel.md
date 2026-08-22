# GoHighLevel integration

The GoHighLevel integration uses a Marketplace OAuth application and one selected location per platform connection. It supports contacts, opportunities, pipelines, calendars, appointments, token refresh, and signed inbound webhooks.

Use the current [HighLevel Marketplace app creation guide](https://marketplace.gohighlevel.com/docs/oauth/CreateMarketplaceApp/) and [authorization documentation](https://marketplace.gohighlevel.com/docs/Authorization/authorization_doc/) as the provider authority.

## Create and configure the app

1. Sign in to the HighLevel Marketplace Developer Portal and create a Marketplace app.
2. Use a location/sub-account installation target for this integration.
3. Under Advanced Settings, configure OAuth scopes, the redirect URL, and webhook subscriptions.
4. Generate the Client ID and Client Secret. Store them only in the API environment.
5. Keep a draft/test version until OAuth, refresh, synchronization, and webhook delivery pass in a sandbox account.

Configure:

```dotenv
HIGHLEVEL_CLIENT_ID=
HIGHLEVEL_CLIENT_SECRET=
HIGHLEVEL_REDIRECT_URI=
HIGHLEVEL_WEBHOOK_PUBLIC_KEY=
HIGHLEVEL_API_BASE_URL=https://services.leadconnectorhq.com
INTEGRATIONS_WEBHOOK_BASE_URL=https://api.example.com/api/v1
```

`HIGHLEVEL_REDIRECT_URI` must exactly match the public web Integrations route, such as `https://app.example.com/integrations`, and the redirect registered in the Marketplace app. Production redirects should use HTTPS. The frontend submits the returned authorization code and single-use state to the API; tokens are encrypted and never returned to the browser.

`HIGHLEVEL_WEBHOOK_PUBLIC_KEY` is the provider verification public key, not the Client Secret. Preserve PEM newlines when supplied in PEM form. `HIGHLEVEL_API_BASE_URL` should remain the official HTTPS endpoint unless an approved test mock is used.

## Required scopes

The implementation currently requests:

```text
locations.readonly
contacts.readonly
contacts.write
opportunities.readonly
opportunities.write
calendars.readonly
calendars/events.readonly
calendars/events.write
```

These cover location discovery, contact synchronization/upsert, opportunity synchronization/mutation, calendars, and appointments. Request the minimum set needed for enabled functionality. HighLevel associates API endpoints and webhook events with scopes; consult the current [scope reference](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/index.html). Scopes can be locked on a live app version, so scope changes may require a new draft/version.

## OAuth and location selection

1. Start **Connect GoHighLevel** from the platform Integrations page.
2. Authorize the requested scopes in HighLevel.
3. The API exchanges the code for access and refresh tokens.
4. Select exactly one HighLevel location for the connection.
5. Run connection validation and a health check.

Access tokens are refreshed using the stored refresh token. If refresh fails or the installation is removed, reconnect rather than inserting tokens manually. Use separate connections when synchronizing multiple locations; this preserves workspace and location isolation.

## Webhooks

Register this callback for the connection in the Marketplace app's webhook settings:

```text
https://api.example.com/api/v1/integrations/webhooks/{workspaceId}/{connectionId}
```

Subscribe only to events required by the integration, including relevant contact events and any opportunity or appointment events enabled for reconciliation. The app must also have the scope required by each event. Webhook subscriptions are configured in HighLevel's Marketplace dashboard; the current platform adapter does not create them remotely.

HighLevel's current webhook guidance uses `X-GHL-Signature` with Ed25519 and says the legacy `X-WH-Signature` RSA header is being deprecated. This repository accepts `X-GHL-Signature` and verifies the exact raw body with `HIGHLEVEL_WEBHOOK_PUBLIC_KEY`; unsigned or invalid deliveries are rejected before storage. See the [official webhook integration guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/) before launch for the current key and migration dates.

Webhook IDs are persisted for idempotency. Processing is queued, and inbound contact changes do not automatically call outbound contact upsert, preventing sync loops.

## Synchronization behavior

### Contacts

Inbound contact pages are normalized through the unified lead-ingestion service. External ID, location, source, unknown fields, and original payload metadata are retained. Duplicate contacts resolve through workspace + provider + external ID and identity matching. Individual contact failures produce a sanitized partial-sync result without discarding successful records.

### Opportunities

Opportunity synchronization retrieves location-scoped records and preserves external opportunity, contact, pipeline, stage, status, and monetary-value fields. Outbound create/update operations require the write scope and should be initiated deliberately; inbound processing does not echo a write back automatically.

### Calendars and appointments

Calendar discovery and appointment synchronization are location-scoped. Appointment mapping preserves the external appointment, contact, calendar, start/end time, and status. Appointment creation requires `calendars/events.write`.

Every sync job is idempotent, bounded to five queue attempts, and records completed, partial, failed, or dead-letter status. Authentication and permission failures mark the connection as needing attention.

## Testing

HighLevel recommends testing Marketplace apps with Sandbox/App Test accounts. See the [official app testing guide](https://marketplace.gohighlevel.com/docs/oauth/AppTestingGuide/index.html).

Test this sequence:

1. Install the draft app into a sandbox location.
2. Complete OAuth and confirm the selected location.
3. Run connection validation and token refresh.
4. Create/update a test contact and verify one CRM lead is produced.
5. Redeliver the webhook and verify no duplicate lead is created.
6. Create an opportunity and appointment, then run their sync resources.
7. Confirm all returned records belong to the selected location/workspace.
8. Inspect HighLevel Marketplace webhook logs for response and signature results.
9. Revoke or expire access in the sandbox and confirm the platform reports **Needs attention** without losing synchronized data.

Do not use production customer PII in fixtures or automated tests.

## Troubleshooting

| Symptom/code | Action |
| --- | --- |
| Redirect URI mismatch | Match `HIGHLEVEL_REDIRECT_URI` exactly in both systems, including trailing slash, then reinstall/reconnect. |
| `HIGHLEVEL_CONFIG_MISSING` | Set Client ID, Client Secret, and redirect URI in the API environment and restart it. |
| `HIGHLEVEL_REFRESH_TOKEN_MISSING` | Reinstall or reconnect the Marketplace app. |
| HTTP 401 | Refresh/reconnect and confirm the installation remains active for the selected location. |
| HTTP 403 | Add the endpoint/event's required scope to a draft app version and reinstall after publishing/testing it. |
| Invalid webhook signature | Confirm `X-GHL-Signature`, the current Ed25519 public key, raw-body preservation, and `HIGHLEVEL_WEBHOOK_PUBLIC_KEY`. |
| No webhook events | Confirm the event URL and event selections in Advanced Settings, required scopes, app installation, and Marketplace webhook logs. |
| Wrong or missing records | Confirm the connection selected exactly one location and the token belongs to that installation. |
| Partial contact sync | Inspect the sync job's sanitized failure count/code, correct the invalid record or transient dependency, then use a new idempotency key to rerun. |
| HTTP 429/5xx | The client honors `Retry-After` and bounded exponential backoff. Reduce sync frequency/page size if throttling persists. |
| Webhooks paused | Correct delivery failures and re-enable events in the Marketplace dashboard according to HighLevel's webhook health guidance. |

Never log or expose Client Secrets, access tokens, refresh tokens, raw signatures, or customer PII.

