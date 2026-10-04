## 🎯 Roadmap

### Phase 1: Core Engine

- [x] Type definitions
- [x] allow user to choose between kind1 and nip-78 event if manifest allows that
- [x] allow updating NIP-78 (or any editable-event) posts created by a manifest when content changes; right now they use an empty `d` tag and overwrite each other
- [x] allow kind 1 comments to update the content of the main event, so users can edit a review inside our view while it still appears as a normal comment in other clients. Use a human-readable content format such as `update: {field}: {new value}` and parse it in our view to apply the change while preserving compatibility with existing clients.
- [x] manifest creator or feed should show the latest version of a user's manifest after updates, even when some relays still return older versions. Filter out stale manifests, and consider using our feed components for the user-manifest list so the logic and UI stay consistent.
- [x] A manifest can inherit from another manifest
- [x] add kind:30818 for objects that are used for review (beer, product, map venue detail)
- [ ] add multi-language support (i18n) for built-in plugins UI components(maybe Lingui.js style). Started: `<nostr-wiki-composer>` takes its text from an overridable messages object (`WikiComposerMessages`); still inline: other web components (picker, view, composer/feed in @nostr-post/web), validation messages (`validateWikiForm`), manifest-creator UI
- [ ] add multi-language support (i18n) for manifest via NIP-78 or kind:30818, d = "{manifestId}:i18n:{locale}", we would need to address version in translations
- [ ] add style customization options for web components (CSS custom properties, theming)
- [ ] fix pwa example shared image/text, it's not getting to post input now
- [ ] fix list plugin to use lists(nip-51?) instead of manifests
- [ ] User mention support: mention autocomplete, user tagging
- [ ] User profile support: display name, profile picture, and profile metadata in comments and posts
- [ ] add link to library in web component footers for better discoverability
- [ ] Publish npm packages for each package (packages/\*) with CI, semantic
      versioning, and automated releases to the npm registry
      resolution (NIP-73 identity tags)
- [ ] add integrity check for bundle integrity="sha384-Base64EncodedHashOfYourFileHere"
- [ ] photo view(see photos of venue)
- [ ] search web component
- [ ] allow to share NIP-78 data to Kind 1 events (for better compatibility with existing clients)
- [ ] manifest definition in manifest, manifest UI editing tool as plugins
- [ ] fix width jumping of manifest editor while loading data/showing json

### Phase 2: Domain Scenarios (Planned)

- [x] Comments support (kind 1) with manifest presets, examples, and protocol-standard reply tags
- [ ] pool plugin
- [ ] Calendar events support (NIP-52) with agenda-oriented rendering
- [ ] calendar view
- [ ] P2P offers support (NIP-69) with filtered feed presets/views
- [ ] Zap support (NIP-57): zap requests/receipts with amount + payer views and filtering
- [ ] Add scenario manifests for:
  - offer creation (NIP-69)
  - offer confirmation messages (NIP-17 formatted payload)
  - deal closing flow events
  - review snapshots

### Wiki Entities (NIP-54, kind:30818)

- [x] Exact `#d` / `#i` lookups: drop relay results that don't match the filter (relay.wikifreedia.xyz fuzzy-matches `#d`)
- [x] Resolve the newest entity version across all relays, not the first relay to answer
- [x] Keep article tables that aren't the manifest infobox (and text before them) as prose
- [x] "+ Create" in `<wiki-entity-picker>` opens a composer for the entity manifest and selects the published entity
- [x] Type-scoped search: a picker only lists entities of its `entityManifest` type (e.g. d-tags ending in `-beer`), and searches/creates with that suffix
- [x] Richer results: show slug, date, summary or first line and version count in picker rows; preview overlay (👁) for results and the selected entity
- [ ] `<nostr-wiki-view>` shows article prose as plain text (raw markdown/Djot): no plugin implements `renderView`; render it formatted
- [x] Wiki preview panel: entity browser (search list that stays open, + New) with View / Edit / Versions / Reviews for the selected entity
- [x] Versions: list every version (newest first, the shown one marked), open one read-only, edit from any version
- [ ] Versions: compare two versions (changed fields + text diff)
- [x] Prose without an infobox is kept verbatim (re-rendering escaped `[[wikilinks]]`, and editing would have published them escaped)
- [ ] Prose after an infobox table is still re-rendered from the Djot AST, which escapes markup like `[[wikilinks]]`
- [x] Slug collisions on create: the composer checks whether a new entity's d-tag is taken and, if so, asks for a distinguishing qualifier (suggested from other fields such as the brewery or style, or typed: year, edition) → `bitcoin-moonshine-beer`; publishing is blocked until the slug is free. The picker offers "+ Create another" for a taken name
- [x] Put the qualifier into the title too, Wikipedia-style: "Bitcoin (Beer)" + "Moonshine" → title "Bitcoin (Moonshine Beer)", d-tag `bitcoin-moonshine-beer`
- [x] Slug check can't silently say "free": if a relay fails or times out and none has the d-tag, it reports "unknown" ("Check again"; publishing isn't blocked, the qualifier input stays available)
- [x] Templates can use a reference field's name: `{brewery}` renders the referenced entity's name without its type ("Russian River Brewing"), e.g. `{title}-{brewery}-(beer)` → `pliny-russian-river-brewing-beer`
- [ ] Controlled vocabularies instead of free text, stored as tags other apps can match:
  - country: ISO 3166 select → `i` tag (`iso3166:CZ`)
  - city: OpenStreetMap / Wikidata lookup (reuse plugin-geo / plugin-venue) → `i` tag with the ID plus `g` geohash
  - beer style: BJCP style guide → `t` tag (`bjcp:21A`)
  - brewery type: Brewers Association categories (microbrewery, brewpub, …) → `t` tag
  - wiki entities stay for things the community describes (breweries, beers), not fixed vocabularies
  - allow to edit enum in manifest editor
- [x] Publishing wiki entities also goes to the author's own relays (signer + NIP-65 list), not only the wiki relays
- [ ] Reading entities uses only the wiki relays; consider adding the reader's own relays (would find their own versions published elsewhere)
- [ ] Example: OSM-based wiki inputs. When creating an OSM venue review, the venue's wiki entity is created automatically from OSM data if it doesn't exist, or updated (a new version) if the OSM data differs from the current version

### Venue Reviews (from INTEGRATION.md)

- [ ] Search/filter reviews by venue
- [ ] Show reviews on map
- [ ] User profile + review history
- [ ] Reputation/trust scoring

### Quality, Tooling & Docs (from DEVELOPMENT_GUIDE.md)

- [x] Set up Vitest for unit testing
- [x] Unit tests for validation functions in @nostr-post/core
- [x] Test EventCoordinator edge cases
- [ ] Comprehensive unit test suite (core, signer, wiki and 4 plugins have tests; web, react and 6 plugins have none)
- [ ] Integration tests for plugin rendering
- [ ] E2E tests for web components
- [ ] Fix the 2 failing E2E tests in `tests/e2e/plugin-integration.test.ts` (geohash `#g` lookup, hashtag auto-extraction)
- [ ] `plugin-list` has no tests, so `pnpm test` (which stops at the first failing package) fails there
- [ ] Test plugins in the manifest-creator tool
- [ ] User testing: get feedback from real-world usage, identify pain points and confusing APIs
- [ ] API stabilization: stabilize the manifest schema, document breaking changes
- [ ] Performance optimizations
- [x] Remove `wss://relay.nostr.band` from `DEFAULT_RELAYS` / `DEFAULT_WIKI_RELAYS` (doesn't respond; every fetch waited ~10 s for it); `DEFAULT_RELAYS` uses `wss://relay.primal.net` instead
- [ ] Pin `next` in nextjs-demo and manifest-creator (`"latest"` re-resolves on every lockfile change)
- [ ] Bring oversized files under the 500-line limit: plugin-markdown input, web view/feed, plugin-geo/venue input, core coordinator, wiki-composer (manifest-creator ManifestEditor and FieldEditor are done)
- [ ] Venue linking UI improvements (OSM ID deep links)
- [ ] Additional plugins: polls, calendars, markets, date, tags, mentions
- [ ] Plugin examples, plugin developer documentation and plugin validation examples
- [ ] Advanced manifest features (conditions, dependencies)
- [ ] plugin-list: delete the list event from relays when a list is deleted (TODO in `packages/plugin-list/src/web.ts`)
- [ ] Documentation: API reference for each package, API documentation website, more usage examples, best practices guide, video tutorials
