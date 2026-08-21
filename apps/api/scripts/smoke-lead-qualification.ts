const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
const token = process.env.SMOKE_AUTH_TOKEN;
const workspaceId = process.env.SMOKE_WORKSPACE_ID;
if (!token || !workspaceId) throw new Error('Set SMOKE_AUTH_TOKEN and SMOKE_WORKSPACE_ID; keep provider API keys only in the API environment.');
const response = await fetch(`${apiUrl}/leads/qualifications`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'x-workspace-id': workspaceId, 'content-type': 'application/json' },
  body: JSON.stringify({ text: process.env.SMOKE_LEAD_TEXT ?? 'We need a CRM for 30 sales reps this quarter. Please send pricing and implementation timing. Contact buyer@example.com.' }),
  signal: AbortSignal.timeout(35_000),
});
if (!response.ok) throw new Error(`Smoke test failed (${response.status}): ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));
