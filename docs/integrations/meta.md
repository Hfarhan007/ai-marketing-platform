# Meta integration

This integration shares one Meta Graph API client and OAuth implementation for Facebook and Instagram. It supports account discovery, Lead Ads ingestion, campaign operations, insights, Page subscriptions, and server-side Conversions API events.

Provider behavior changes over time. Confirm permissions and review requirements in the [Meta developer documentation](https://developers.facebook.com/docs/) before submitting an app.

## Application configuration

Create a Meta developer app suitable for business use at [Meta for Developers](https://developers.facebook.com/apps/). Add Facebook Login for Business, Webhooks, and Marketing API products as available for the selected app type. Lead Ads and Instagram capabilities use the same Meta app.

Configure these server-side values:

```dotenv
META_APP_ID=
META_APP_SECRET=
META_GRAPH_API_VERSION=
META_WEBHOOK_VERIFY_TOKEN=
META_REDIRECT_URI=
INTEGRATIONS_WEBHOOK_BASE_URL=https://api.example.com/api/v1
```

- `META_APP_ID` and `META_APP_SECRET` come from the app dashboard. Never expose the secret to the browser.
- `META_GRAPH_API_VERSION` pins Graph API behavior. If empty, this repository currently defaults to `v23.0`. Validate a new version before changing it.
- `META_WEBHOOK_VERIFY_TOKEN` is a long, random value chosen by the operator. It is not the App Secret.
- `META_REDIRECT_URI` is the exact public web Integrations route that initiated OAuth, such as `https://app.example.com/integrations`. Add the exact same URI to the Facebook Login valid OAuth redirect URI list. Scheme, host, path, port, and trailing slash must match.
- `INTEGRATIONS_WEBHOOK_BASE_URL` is the public API prefix used to construct callbacks.

Restart the API after changing environment configuration.

## Permissions and app review

The implementation requests the following Facebook connection permissions:

| Permission | Purpose |
| --- | --- |
| `public_profile` | Connected user identity |
| `pages_show_list` | Discover Pages the user can access |
| `pages_read_engagement` | Read Page identity and related resources |
| `pages_manage_metadata` | Subscribe a selected Page to `leadgen` webhooks |
| `leads_retrieval` | Retrieve complete Lead Ads submissions |
| `business_management` | Discover eligible business assets |
| `ads_read` | Read ad accounts, campaigns, delivery, and insights |
| `ads_management` | Create and update campaigns, ad sets, ads, and creatives |

Instagram connections request `public_profile`, `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`, `business_management`, and `ads_read`.

Development access and production access are different:

- In development mode, app administrators, developers, testers, and provider test users can exercise approved development assets. This does not prove that ordinary customers can authorize the app.
- In production, permissions that require Advanced Access must pass Meta App Review for the documented use case. Business verification, data-use answers, screencasts, test credentials, and asset access may also be required.
- Request only permissions used by the product. Review approval for one permission does not grant access to Pages, forms, ad accounts, or datasets the authorizing business does not control.
- Do not switch the app live until OAuth, deletion/privacy requirements, webhook verification, and permission review are complete.

Use Meta's current [App Review documentation](https://developers.facebook.com/docs/app-review/) as the authority; dashboard requirements vary by app type and capability.

## Facebook Login and resource selection

1. Add the deployment's exact `META_REDIRECT_URI` under Facebook Login settings.
2. In the platform Integrations page, create or reconnect Facebook & Instagram.
3. Complete Meta authorization. OAuth state is single-use and expires after ten minutes.
4. Select a Facebook Page. Do not assume a user has only one Page.
5. Select an Ad Account.
6. Select an Instagram business account if the Page exposes one.
7. Select the Lead Forms and Pixel needed by this workspace.
8. Enable the webhook subscription and run the connection health check.

Selections and credentials are workspace-scoped. Tokens remain encrypted on the API; the frontend receives only public account/resource metadata.

## Lead Ads webhooks

For a connection, the callback URL is:

```text
https://api.example.com/api/v1/integrations/meta/webhooks/{workspaceId}/{connectionId}
```

Configure the Meta Webhooks product for the Page object:

1. Register the callback URL and the exact `META_WEBHOOK_VERIFY_TOKEN`.
2. Subscribe to the `leadgen` field.
3. In the platform, select the Page and call **Enable webhook subscription**. The API subscribes each selected Page through `/{page-id}/subscribed_apps?subscribed_fields=leadgen`.
4. Confirm the integration UI reports the subscription as active.

The verification GET checks `hub.mode`, `hub.verify_token`, and returns `hub.challenge`. Delivery POSTs must include `X-Hub-Signature-256`. The API computes HMAC-SHA256 over the exact raw body with `META_APP_SECRET` and rejects a missing or invalid signature before storing the event. There is no development bypass.

After verification, lead events are durably deduplicated, queued, fetched from Graph API by `leadgen_id`, normalized into the existing CRM lead model, and sent to asynchronous qualification/workflow processing.

## Testing Lead Ads

Use Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/) with a selected Page and form. Delete an earlier test lead in the tool if Meta prevents another submission for the same form. Then verify:

- Meta reports a successful webhook delivery.
- The integration event is processed rather than dead-lettered.
- Re-delivering the same event does not create another CRM lead.
- Unknown form fields appear only in provider metadata/custom fields.
- Qualification happens asynchronously and webhook acknowledgement remains fast.

Developer/test mode can restrict the tool and lead retrieval to app-role users and owned test assets. Always repeat the test with a reviewed live app and a production-like business asset before launch.

## Marketing API and insights

The selected Ad Account is required for campaigns and reporting. Grant the authorizing user an appropriate role on the Ad Account and Page. The implementation requests paginated, bounded insight payloads and caches reports briefly. Metrics include spend, impressions, reach, clicks, leads, conversions, CPL/CPA, and ROAS. ROAS is omitted when no valid purchase value exists.

Campaign creation may remain unavailable even with a valid token when the ad account is restricted, payment is incomplete, the requested objective is unavailable, or the app lacks reviewed `ads_management` access. Surface these provider errors rather than broadening permissions.

## Conversions API

Select a Pixel in the connection before sending events. The server supports `Lead`, `Contact`, `Schedule`, `Purchase`, and explicitly allowed custom events. It normalizes and SHA-256 hashes customer identifiers, uses stable `event_id` values for browser/server deduplication, queues delivery with bounded retries, and stores only sanitized delivery summaries.

For production:

1. Confirm the Pixel/dataset belongs to the selected business and Ad Account.
2. Configure event source URLs and action sources accurately.
3. Reuse the browser Pixel `event_id` for the corresponding server event.
4. Use Meta Events Manager's test event code only during testing; remove it for production traffic.
5. Validate match quality, deduplication, consent, and regional privacy requirements in Events Manager.

See Meta's [Conversions API documentation](https://developers.facebook.com/docs/marketing-api/conversions-api/) for current parameter and policy requirements.

## Common errors and troubleshooting

| Symptom/code | Action |
| --- | --- |
| Redirect URI mismatch | Make the dashboard URI and `META_REDIRECT_URI` identical; reconnect afterward. |
| `META_TOKEN_EXPIRED`, OAuth error 190, or “Needs attention” | Reauthorize the connection. Do not copy tokens into the database manually. |
| HTTP 403 or missing permission | Check app mode/review status, requested scopes, user asset roles, and Page/Ad Account ownership. |
| Webhook verification returns 403 | Confirm the dashboard verify token exactly matches `META_WEBHOOK_VERIFY_TOKEN`. |
| Invalid `X-Hub-Signature-256` | Confirm the app and `META_APP_SECRET` match and that the proxy preserves the raw request body. |
| No lead arrives | Confirm Page `leadgen` subscription, selected form, `leads_retrieval`, Page access token, and Meta delivery logs. |
| Lead event retries/dead-letters | Inspect the sanitized provider failure code and connection health; preserve the event for replay after correcting access. |
| HTTP 429 or temporary 5xx | The client honors `Retry-After` and bounded retries. Reduce polling/report ranges if limits persist. |
| Empty ad/insight results | Verify the selected `act_...` account, date range, object status, and `ads_read` access. |
| Duplicate leads | Verify the provider event contains a stable `leadgen_id`; ingestion deduplicates by workspace, provider, and external lead ID. |

Never paste tokens or App Secrets into logs, tickets, browser storage, or screenshots.

