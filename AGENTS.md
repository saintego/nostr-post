# Agent Instructions

Guidance for AI coding agents (and humans) working in this repo. Claude Code reads it
through CLAUDE.md. Nested AGENTS.md files (e.g. tools/manifest-creator/AGENTS.md, written by
`next dev`) add rules for their directory.

## Technical Standards

From DEVELOPMENT_GUIDE.md ("Technical Standards (CRITICAL)" and "Key Design Decisions").
Apply them to new and changed code; existing exceptions are listed so you don't copy them.

### Files

- Keep source files under 500 lines. When a change would push a file over, split it into
  focused modules first. Files already over the limit are tracked in ROADMAP.md: don't grow them.

### Exports

- No barrel files: don't add `export * from` re-export files inside a package. Expose public
  modules through explicit subpath exports in package.json (`"./types"`, `"./web"`, …).
- Exception: each package's `src/index.ts` is its main entry point. Add new public API there
  as explicit named exports, never `export *`.

### Style

- Functional core: logic is pure functions over immutable data, returning `Result` values
  for expected failures instead of throwing. No classes holding mutable state.
- Exception: Lit web components (`LitElement` subclasses) are classes by necessity. Keep them
  thin and move logic into pure functions they call.
- Prefer `const` over `let` (soft rule). Use `let` when a value really changes, e.g. a counter,
  a loop accumulator or module state like a "registered once" flag. Don't contort code to avoid
  it: no IIFEs, nested ternaries or `reduce` gymnastics just to get a `const`.

### Dependencies

- Framework agnostic: `@nostr-post/core` has zero dependencies, and core/plugin logic must not
  depend on React, Lit or the DOM. Framework code lives in `web`/`react` and in plugins'
  `web` entry points.
- pnpm workspaces: depend on sibling packages with `workspace:*`.

### Types

- TypeScript strict mode (`strict: true` in the root tsconfig). No `any`; type-check exhaustively.
- `noUncheckedIndexedAccess` and `noImplicitOverride` are listed in the guide but not enabled yet.
  Write code that would pass them: guard indexed access, mark overrides with `override`.

### Tooling

- Biome for linting and formatting: `pnpm lint`, `pnpm lint:fix`, `pnpm format`. The pre-commit
  hook (lefthook) formats staged files.

## Packages are the product

- Packages (`packages/*`) must work standalone, as they will be published to npm and in the CDN
  bundle (`packages/cdn`). A feature must work in any app that imports the package, not only in
  the manifest creator or an example.
- Don't rely on setup that only an app does (e.g. registering manifests from
  `tools/manifest-creator/lib/examples.ts`). Accept inline values, or resolve references from
  Nostr (e.g. a published manifest's `30078:` address); app-specific data like example
  manifests stays in the app.
- Public API goes through the package's entry points and, for plain-HTML users, the CDN bundle's
  exports.
- Keep `examples/*` and `tools/manifest-creator` thin: they compose package features. Logic or UI
  that other apps would need belongs in a package.

## User-facing text

- Shared components serve every manifest and entity type: keep their wording generic. Don't
  hard-code domain examples ("brewery", "barrel aged"); derive them from the manifest (field
  labels, values) instead.
- Prepare for translation: put a component's user-facing text in a messages object with English
  defaults that apps can override (see `packages/wiki/src/web/wiki-composer-messages.ts`), not
  inline in templates. Move existing inline text over when you touch it.

## Keep docs in sync

- When a change adds or changes public API (exports, component properties/events, manifest
  `metadata` keys, plugin hooks), update the package README in the same commit; for the CDN
  bundle also packages/cdn/README.md's export list. Plugin hooks are documented in PLUGINS.md.
- When a change alters behaviour a doc describes, fix that doc. Don't add new docs for it;
  extend the existing one.
- Docs describe what exists. Planned work goes to ROADMAP.md.

## Keep ROADMAP.md in sync

ROADMAP.md is the single list of open work. Other docs (DEVELOPMENT_GUIDE.md, INTEGRATION.md,
READMEs) link to it instead of keeping their own TODO lists.

- When a change completes a roadmap item, check it off (`- [x]`) in the same commit.
- When a change completes part of an item, update the item's text to say what's left.
- When you find new work (a bug you didn't fix, a follow-up, a TODO comment you add),
  add it to the fitting ROADMAP.md section rather than to another doc.
- Don't delete finished items; checked items record what's done.
