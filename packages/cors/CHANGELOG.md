# @tritio/cors

## 1.0.0

### Minor Changes

- bc4fd41: refactor(core): Complete re-architecture to Lifecycle & Plugin system.
  - **Breaking Change**: Removed built-in `.docs()` method. Use `@tritio/docs` plugin instead.
  - **Breaking Change**: Removed `cors` option from constructor. Use `@tritio/cors` plugin instead.
  - **Breaking Change**: Deprecated `.middleware()` in favor of lifecycle hooks or plugins.
  - **New Feature**: Added `.use()` method for installing plugins with type inference mutation.
  - **New Feature**: Added granular lifecycle hooks: `.onBeforeHandle`, `.onAfterHandle`, `.onTransform` (replaces logic inside derive), and `.onRequest`.
  - **Refactor**: Rewrote `derive` and `mount` types to fix circular dependencies and strict type narrowing.
  - **Refactor**: Exposed public `.routes` getter for ecosystem tools.

  feat(docs): Initial release of `@tritio/docs`.
  - Provides `docs()` plugin.
  - Auto-generates OpenAPI 3.0 spec from TypeBox schemas.
  - Includes Scalar API Reference UI.
  - Supports `detail` property in route schemas for grouping (tags), summary, and description.

  feat(cors): Initial release of `@tritio/cors`.
  - Provides `cors()` plugin based on H3 `handleCors`.
  - Supports loose typing for origins/methods (strings or arrays) for better DX.

  fix(client): Synced type inference with Core v0.3.0 changes.
  fix(cli): Updated scaffolding templates to use the new Plugin Architecture.

### Patch Changes

- Updated dependencies [bc4fd41]
  - tritio@0.3.0
