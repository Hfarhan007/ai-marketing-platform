# Contributing

Use Node 20 and the pnpm version declared in `package.json`.

1. Run `pnpm install --frozen-lockfile`.
2. Keep features behind their public `index.ts` boundary.
3. Run `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm build`.
4. Submit focused changes with a conventional commit message.

Never commit credentials, customer data, generated build output, or local environment files.
