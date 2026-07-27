# Frontend boundaries

Features may import `app` configuration and `shared` modules. Cross-feature imports must use the target feature's `index.ts`. Shared code cannot import features. Dependency Cruiser validates circular imports and shared-to-feature violations.
