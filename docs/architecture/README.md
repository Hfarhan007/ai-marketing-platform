# Architecture

The repository uses pnpm workspaces orchestrated by Turborepo. Deployable applications live in `apps`, reusable capabilities in `packages`, and developer automation in `tooling`.

Dependencies flow from applications to packages. Shared packages must not import from applications.
