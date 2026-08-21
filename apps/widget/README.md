# Embeddable widget

This is a standalone React/Vite application. It does not import the dashboard, router, state,
charts, or feature bundles. Chat, lead, and booking panels are lazy chunks.

Build with `pnpm --filter @repo/widget build` and publish `dist/` to a CDN. The output includes
`index.html`, hashed application chunks, `embed.js`, source maps, and `.vite/manifest.json`.

Script mode:

```html
<link rel="stylesheet" href="https://cdn.example.com/widget/embed.css">
<script defer src="https://cdn.example.com/widget/embed.js"
  data-workspace="public_workspace_id" data-api="https://api.example.com"></script>
```

Iframe mode:

```html
<iframe title="Customer support" loading="lazy"
  sandbox="allow-forms allow-scripts allow-same-origin"
  src="https://cdn.example.com/widget/index.html?workspace=public_workspace_id&api=https%3A%2F%2Fapi.example.com&mode=inline"></iframe>
```

The host CSP needs only the CDN in `script-src`, `style-src`, and `frame-src`, plus the API origin
in `connect-src`. No inline script, `eval`, credentialed request, or dashboard asset is required.
The server must independently rate-limit all `/public/widget/*` routes; client throttling is only
an additional UX guard and is not a security boundary.
