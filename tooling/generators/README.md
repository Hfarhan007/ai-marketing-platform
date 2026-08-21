# Repository-aware feature generator

Generate a new NestJS module and, optionally, a React feature using this repository's directory and import conventions.

```bash
pnpm generate:feature
```

The command asks for a kebab-case module name and six feature choices. It refuses invalid names, existing modules/features, or any operation that would overwrite a file. Generated code is intentionally not registered automatically. After generation, follow the printed instructions to import the Nest module in `apps/api/src/app.module.ts` and add the frontend page to `apps/web/src/app/router/router.tsx` when requested.

For automation, pass flags:

```bash
pnpm generate:feature -- --name customer-segments --tenant-owned yes --crud yes --events yes --queue no --frontend yes
```

Boolean values accept `yes`, `no`, `true`, or `false`. Run the normal `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm build` checks after registration.
