# Agent Instructions

Guidance for AI coding agents (and humans) working in this repo. Claude Code reads it
through CLAUDE.md. Nested AGENTS.md files (e.g. tools/manifest-creator/AGENTS.md, written by
`next dev`) add rules for their directory.

## Technical Standards

From DEVELOPMENT_GUIDE.md ("Technical Standards (CRITICAL)" and "Key Design Decisions").
Apply them to new and changed code; existing exceptions are listed so you don't copy them.

### Files

- Keep source files under 500 lines. When a change would push a file over, split it into
  focused modules first. Files already over the limit are tracked in issues: don't grow them.

### File names

- Files are camelCase: `composerField.ts`, `enumOptions.test.ts`, `beerStyleBjcp2021.json`.
- React components are PascalCase, named after the component: `OptionsEditor.tsx`.
- Tool config files keep their tool's name (`vitest.config.ts`, `next.config.js`).
- Kebab-case source files from before this rule are listed in an issue for renaming; name new
  files next to them in camelCase.

### Exports

- No barrel files: don't add `export * from` re-export files inside a package. Expose public
  modules through explicit subpath exports in package.json (`"./types"`, `"./web"`, …).
- Exception: each package's `src/index.ts` is its main entry point. Add new public API there
  as explicit named exports, never `export *`.

### Style

- Functional core: logic is pure functions over immutable data, returning `Result` values
  for expected failures instead of throwing. No classes holding mutable state.
- No classes, except custom elements: the Web Components standard only accepts a class
  (`customElements.define`), so Lit components (`LitElement` subclasses) are classes. Keep them
  thin: properties, state and `render()`; logic and larger template parts go into functions in
  other modules (e.g. `packages/web/src/composerEnum.ts`).
- Private members of custom elements (methods, `@state()` fields) start with `_`: Lit's convention,
  and it marks them internal at runtime too, where TypeScript's `private` is gone (components are
  public classes in the CDN bundle). Plain function modules don't need the prefix.
- Prefer `const` over `let` (soft rule). Use `let` when a value really changes, e.g. a counter,
  a loop accumulator or module state like a "registered once" flag. Don't contort code to avoid
  it: no IIFEs, nested ternaries or `reduce` gymnastics just to get a `const`.

### Dependencies

- Framework agnostic: `@nostr-post/core` has zero dependencies, and core/plugin logic must not
  depend on React, Lit or the DOM. Framework code lives in `web`/`react` and in plugins'
  `web` entry points.
- A package's main entry (its logic) never imports its `/web` or `/react` entry, Lit, React or
  the DOM; `/web` and `/react` build on the main entry, not the other way round. Logic a UI needs
  (loading, naming, validation, building events) goes into the main entry as framework-free
  functions, so an app can build its own UI on it without importing `/web`; `/web` and `/react`
  keep only components, templates and styles. A function that mixes logic with a template is
  split.
- The same goes for docs: a package README documents its main entry first (what works without
  any UI), and `/web` and `/react` in their own sections.
- pnpm workspaces: depend on sibling packages with `workspace:*`.

### Types

- TypeScript strict mode (`strict: true` in the root tsconfig). No `any`; type-check exhaustively.
- `noUncheckedIndexedAccess` and `noImplicitOverride` are listed in the guide but not enabled yet.
  Write code that would pass them: guard indexed access, mark overrides with `override`.

### Tooling

- Biome for linting and formatting: `pnpm lint`, `pnpm lint:fix`, `pnpm format`. The pre-commit
  hook (lefthook) formats staged files.

## Package tiers

- `@nostr-post/ui`: the design system, below everything else: tokens, shared primitives, part names
  and style overrides. `web`, `react`, `outbox`, domains and plugins' `/web` entries depend on it; it
  depends on nothing of ours. Main entry framework-free (tokens as data, generated CSS, names);
  `/web` for Lit; later `/react`, `/react-native` or other UI libraries on the same tokens.
  `@nostr-post/react` wraps the Lit components.
- `@nostr-post/core`, `signer`, `plugins`, `posts`, `web` (and `react`, `cdn`): the base. `posts` is
  the UI-free logic of posts (kind 1 and manifest-made events, NIP-78 included): publishing,
  replies, threads, reactions, feeds, update comments; `web` (Lit) and `react` build their
  components on it and keep only components, templates and styles. `web` knows posts, the
  outbox (a post whose files upload later is queued there) and the registries; it never depends on a domain package. One exception: plugin autoload (`pluginAutoLoad.ts`) lazy-loads a field's `/web`
  entry by its `uiPlugin` id, also from a domain package that provides the field (`list`), so a
  manifest's fields work in any app; it never imports a domain's code statically.
- `@nostr-post/outbox`: posts published later (drafts, timed posts, upload later). Depends only on
  `signer`, so it could move out of the repo; the other packages use it through its small API.
- `@nostr-post/plugin-*`: field plugins, one `uiPlugin` field type each (main entry: the field's logic;
  `/web`: its input and view).
- `@nostr-post/<domain>` (`wiki`, `calendar`, `list`): a NIP or domain of its own: its kinds, reading
  and publishing, event actions, and its own elements. Domains plug into `web` through
  `@nostr-post/plugins/entities` (`registerKindView`, `registerEventAction`, `registerSectionView`, entity manifests), and may
  provide fields and depend on field plugins, never the other way round.

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

## Styling

One visual language for every component and the larger apps (manifest creator, gigs), from
`@nostr-post/ui` (see its README). Material 3 is the reference for new UI (roles, states, spacing),
not a dependency.

- **Share, don't restyle**: for a button, field, chip, badge, card, list item, dialog, menu,
  message and the like, use the primitive (`np-button np-filled`, `np-input`, `np-message np-error`,
  …). Components extend `NpElement` and put `npStyles` first in `styles`; apps load `ui.css`. A
  missing variant or a new kind of generic piece is added to `@nostr-post/ui`, not built in a
  component or app. Keep a component's own class next to the primitive's when code or tests use it
  (`class="preview-btn np-icon-button"`).
- **Shared components in `@nostr-post/ui/web`**: a Lit component (or a template part) that two
  places need, or that would repeat markup another component already has (a dialog with a title
  and Close, a lightbox), becomes a generic component in `packages/ui/src/web` with its own
  `*Messages.ts` and `*Styles.ts` and a subpath export (`@nostr-post/ui/web/dialog`); the places
  use it instead of copying the markup. Domain or Nostr logic stays out of it: the component
  takes plain data (`.slides`, `heading`), the caller maps its events to it.
  - Before adding a component, or markup like a dialog, overlay, menu, picker or lightbox, search
    `packages/ui/src/web` (`<np-dialog>`, `<np-lightbox>`, …) and the other packages for the same
    pattern (`<dialog`, `showModal`, `role="dialog"`, `popover`, the same `np-*` structure). Do it
    in the main session while making the change: you know what markup is new.
  - For an occasional repo-wide audit (a large PR, before a release), run the read-only
    `component-sweep` agent (`.claude/agents/componentSweep.md`, Sonnet). It reports candidates;
    deciding and moving stays with the main session.
- **Tokens only**: colors, font sizes, radii, spacing and shadows come from `--np-*` tokens; no
  hex/rgb values or px font sizes in component or app styles (no colors in React style objects).
  A new token goes into the token data in `packages/ui/src/tokens.ts` and its README.
- **Dark theme from the tokens**: the `dark` class on an ancestor swaps token values. No
  `:host-context(.dark)` rules. Still check every new or restyled component and app page with
  the `dark` class.
- **Parts**: expose `part`s on key elements with the shared names (`npPart`: `card`, `header`,
  `button`, `primary`, `input`, …), forward them from nested components
  (`exportparts=${npExportParts}`), and list them in the package README.
- Component styles live in their own module (`*Styles.ts`), not inline in the element.

## User-facing text

- Shared components serve every manifest and entity type: keep their wording generic. Don't
  hard-code domain examples ("brewery", "barrel aged"); derive them from the manifest (field
  labels, values) instead.
- Prepare for translation: put a component's user-facing text in a messages object with English
  defaults that apps can override (see `packages/wiki/src/web/wikiComposerMessages.ts`), not
  inline in templates. Move existing inline text over when you touch it.

## Keep docs in sync

- When a change adds or changes public API (exports, component properties/events, plugin
  hooks), update the package README in the same commit; for the CDN bundle also
  packages/cdn/README.md's export list. Plugin hooks are documented in PLUGINS.md.
- Manifest keys (manifest, field, plugin `metadata`, `wikiConfig`) are documented in MANIFEST.md.
  What a specific manifest's fields mean belongs in the manifest itself: `metadata.description`
  of the manifest and of each field, not in a README.
- When a change alters behaviour a doc describes, fix that doc. Don't add new docs for it;
  extend the existing one.
- Docs describe what exists. Planned work goes to GitHub Issues.

## Look ahead with GitHub Issues

Open work is tracked in the repository's [GitHub Issues](https://github.com/saintego/nostr-post/issues):
one issue per piece of work, labels for the area (`core`, `domains`, `wiki`, `venue-reviews`,
`tooling`), sub-issues for the parts of a larger item.

- Before starting a change, read the open issues it touches or that build on the same code
  (search the issues, and the sub-issues of the area's larger items).
- If an open issue would need a different data model, API or file layout than the simplest version
  of your change, say so before building: offer the future-ready version (what it prepares, what it
  costs now) or the simple one, and let the user choose. Don't silently build either.
- When the future-ready version costs little (a field name, a parameter, a module boundary), prepare
  it and mention which issue it prepares.

## Keep the issues in sync

GitHub Issues are the single list of open work. Docs (DEVELOPMENT_GUIDE.md, INTEGRATION.md,
READMEs) link to issues instead of keeping their own TODO lists. ROADMAP.md is obsolete: kept for
a while as the record from before issues (its items are the issues labelled `roadmap`), not
updated anymore.

- A PR that completes an issue says `Closes #<number>` in its description, so merging closes it.
- When a change completes part of an issue, comment on the issue (or edit it) to say what's left.
- When you find new work (a bug you didn't fix, a follow-up, a TODO comment you add), open an issue
  for it, with the area's label (a sub-issue of the larger item it belongs to), rather than adding
  it to a doc; a TODO comment names the issue (`TODO(#123)`). Ask the user before opening issues
  outside the change at hand.
- Don't delete issues; closed ones record what's done.

## Commits

- Don't commit (or push) without the user's approval. Finish the change, show what changed and
  how it was checked, and ask before running `git commit`. Approval covers that one commit, not
  later ones.
