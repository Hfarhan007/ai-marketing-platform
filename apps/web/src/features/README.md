# Feature modules

Feature folders stay intentionally empty until product work begins. Once implemented, a large feature should use only the layers it needs from this convention:

```text
api/
components/
pages/
hooks/
store/
schemas/
types/
utils/
constants/
mocks/
tests/
index.ts
```

The feature's public API must be exported through `index.ts`; application code should not reach into another feature's internals.
