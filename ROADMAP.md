## 🎯 Roadmap

### Phase 1: Core Engine

- [x] Type definitions
- [x] allow user to choose between kind1 and nip-78 event if manifest allows that
- [x] allow updating NIP-78 (or any editable-event) posts created by a manifest when content changes; right now they use an empty `d` tag and overwrite each other
- [x] allow kind 1 comments to update the content of the main event, so users can edit a review inside our view while it still appears as a normal comment in other clients. Use a human-readable content format such as `update: {field}: {new value}` and parse it in our view to apply the change while preserving compatibility with existing clients.
- [x] manifest creator or feed should show the latest version of a user's manifest after updates, even when some relays still return older versions. Filter out stale manifests, and consider using our feed components for the user-manifest list so the logic and UI stay consistent.
- [x] A manifest can inherit from another manifest
- [x] add kind:30818 for objects that are used for review (beer, product, map venue detail)
- [ ] add multi-language support (i18n) for built-in plugins UI components(maybe Lingui.js style). Started: `<nostr-wiki-composer>` and `<wiki-entity-picker>` take their text from overridable messages objects (`WikiComposerMessages`, `WikiEntityPickerMessages`); still inline: other web components (view, composer/feed in @nostr-post/web), validation messages (`validateWikiForm`), manifest-creator UI
- [ ] add multi-language support (i18n) for manifest via NIP-78 or kind:30818, d = "{manifestId}:i18n:{locale}", we would need to address version in translations (labels, placeholders and field descriptions)
- [ ] add style customization options for web components (CSS custom properties, theming)
- [ ] Dark mode in the manifest creator (follow `prefers-color-scheme`, with a toggle); the web components' colors need CSS custom properties for it (see theming above)
- [ ] fix pwa example shared image/text, it's not getting to post input now
- [ ] fix list plugin to use lists(nip-51?) instead of manifests
- [ ] User mention support: mention autocomplete, user tagging
- [ ] Show user names on posts and comments reliably. Done: one profile loader in the signer (`fetchProfile`, `fetchProfiles`) for view authors, feed names and mentions: newest kind 0 per pubkey, one `limit: 1` filter per pubkey (a single multi-author filter hit purplepag.es's result cap), the `INDEXER_RELAYS` (purplepag.es) besides the app's relays, `nprofile` relay hints, a shared cache, in-flight deduplication and one batched request per tick. Left: the author's NIP-65 relays (outbox model); fallback to a short `npub`, not hex; show the NIP-05 identifier when verified
- [ ] User profile view: a `<nostr-profile>` web component (+ React wrapper) with picture, name, about, NIP-05, website and the user's posts (optionally filtered by manifest, e.g. their reviews); post and comment author names link to it (app-overridable link target)
- [x] `<nostr-post-view>` shows kind 1 text like other clients: links, images/videos (extension or `imeta`), `#hashtags` and `nostr:` references in place (`@nostr-post/core/noteContent`), HTML-escaped; `r`/`t` tag values the text already shows aren't repeated below it
- [x] Inline note text: `nostr:npub`/`nprofile` mentions show the profile name (`@name`), fetched in one batch per post, newest kind 0 per pubkey (`fetchProfiles`); core decodes them without dependencies (`@nostr-post/core/nip19`, which now also holds the `naddr` helpers)
- [ ] Inline note text, follow-ups: `nevent`/`naddr` link out instead of embedding the quoted event; hashtags aren't clickable (app-overridable target, e.g. a `#t` feed filter); image galleries for several images in a row
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
- [x] Controlled vocabularies, part 1: enum options with value, label, group, description and an unpublished `code`; one published value per field (readable values like `american-ipa` in `t`), infobox rows show the label; options editor in the manifest creator; BJCP 2021 beer styles (121, category 27 split into its beers) as the `beer-style-bjcp-2021` base manifest (imported once from beerjson/bjcp-json), which the beer entity extends; brewery type (Brewers Association segments)
- [x] Controlled vocabularies, part 2: brewery location from OpenStreetMap instead of free-text country and city. A venue field with `metadata.levels` (country, city, place) searches those levels; every level gets `i` `iso3166:CZ` (NIP-73) and `i` `wikidata:Q…` when OSM has one, so "breweries in Czechia" is one `#i` query; a city a 4-character geohash, a country none; geohash prefixes on wiki pages too. Cities and countries are not wiki entities: they're identities with existing authorities (ISO 3166, OSM, Wikidata), and community-made country pages would invite fake or disputed ones; disputed territories follow OSM. Venue pages also get their country and Wikidata `i` tags
- [x] Brewery location at an exact place creates/links the venue wiki page from the brewery's form: the wiki composer runs plugin `beforePublish` hooks and renders `publishSummaryTagName` (shared via `@nostr-post/plugins/publish`); cities and countries get no venue page
- [ ] A city wiki page, if people want to describe cities; with the same `i` tags it links up like the venue hub
- [x] References with a role (wiki entities): an entity can point to several entities of one type, each in a role, using only NIP-01 and NIP-54. Every referenced entity is a plain `a` tag (`#a` queries find all beers a brewery was involved in); a `ref` field mapped to an `a` tag and the infobox writes its row as NIP-54 wikilinks (`Brewed at | [Pivovar Z][pivovar-z-brewery]`), and reading matches them to the `a` tags. The wiki-entity picker has `multiple: true`. A `ref` field without a row takes the `a` tags no row claims; entities written before roles read into the first role field. One entity in two roles gets one `a` tag. First use: the beer example's `breweries` (several for a collaboration) and `brewed_at`
  - not chosen: a 4th marker element on `a` (NIP-10 markers exist only for `e`, with fixed values), NIP-32 labels (they label the event or the referenced entity, not which `a` tag), custom tag names (other clients and `#a` queries miss them)
  - no collaboration entity: a collaboration has no identity beyond the beer; a brewery's page can list its collaborations from the beers that reference it (see "Related items")
- [x] References with a role, next uses: a brewery has one OSM location (its brewery site, with its own tags and venue page) plus any number of venues in roles: `brewing_sites` and `taprooms` are pickers on venue pages with role rows; fields that write `a` tags skip those role rows claim
- [ ] References with a role: beer styles if they become wiki pages
- [x] Beer review: optional `tasting_at` and `purchase_at` venues (pickers on venue pages, with "+ Create" from OpenStreetMap). The role is kept: kind 1 reviews get a NIP-27 mention line per venue after the text ("Tasted at: nostr:naddr1…", read back by label, else field order); NIP-78 reviews the address under the field's key; plain `a` tags for `#a` queries. The view shows the text without the lines and a row per role; editing prefills them. Core: zero-dependency NIP-19 `naddr` encoding; "first-active" now applies all of a field's mappings on its kind; `ref` fields accept picked entities (the picker's object value failed the coordinator's string check before)
- [x] Venue fields in "link only" mode (`metadata.linkOnly`) for venues in a role: OSM search and map as before, the venue hub creates/links the venue page, the post gets only the `a` tag and the role (mention line / JSON key), no `i`/`g`/`location` tags. The post composer builds the post again after its hooks ran (`runPublishHooks`), with the linked page in the role. The beer review's `tasting_at` and `purchase_at` use it
- [x] Link-only venues on wiki pages: venue fields with `multiple` (a list, shown as removable entries plus the OSM search; one venue-page panel per venue; hooks run per venue) and `linkOnly` write role rows; the wiki composer builds the page again after its hooks. The brewery's `brewing_sites`/`taprooms` use them instead of pickers
- [x] Link-only venues show their place: a review stores just the link to the venue page, so the venue view and the venue input load the page and take its name (title), area (`g`) and OSM ID from its tags. The post view's role rows render the field's own view ("Tasted at" with the venue's name and map), and editing fills the venue field
- [x] Related items on a wiki entity's page, defined by its manifest (`wikiConfig.related`): each section lists wiki entities of a type (`dTagSuffix`, optionally in a `role`: "Beers" vs. "Brewed here for others") or posts of given kinds (optionally linking a `manifest`), found by the `a` tags of every version of the entity, in batches; newest version per entity, "Show more". `<nostr-wiki-related>` in `@nostr-post/wiki`, shown by `<nostr-wiki-view>` unless `hide-related` (React `hideRelated`); replaces the manifest creator's app-only Reviews tab. Examples: a brewery's beers, a beer's reviews, a venue's reviews and breweries with a taproom there
- [x] Searchable select for long enum lists: more than 20 options (or `metadata.searchable`) get a search input with a `<datalist>` in the post and wiki composers
- [x] Entity manifests registered by an app or given inline resolve `extends`: parents by registered id first, then from relays (by address or bare id)
- [x] Link a BJCP style to its bjcp.org page: enum options carry unpublished extra keys (`code`, `category`), link templates read them as `{fieldId.key}`; local styles (X1…) have no bjcp.org page and get no link
- [x] Publishing wiki entities also goes to the author's own relays (signer + NIP-65 list), not only the wiki relays
- [ ] Reading entities uses only the wiki relays; consider adding the reader's own relays (would find their own versions published elsewhere)
- [x] Example: OSM-based wiki inputs (venue hub). Publishing an OSM venue review creates the venue's wiki entity (`venue-entity-v1`) from OSM if missing, or a new version when the OSM element changed since the synced version (only OSM-sourced fields; community fields kept), and links the review via `a`. Opt-out checkbox in the venue field; `source` tag + "© OpenStreetMap contributors". Generic `beforePublish` plugin hook; fields declare `metadata.sources.osm`
- [x] Add manifest creator visual representation for wikiEntity: 'venue-entity-v1' (venue fields have a "Wiki page manifest" input, like the picker's "Entity manifest")
- [x] Entity manifests can be referenced by a published manifest's address (`30078:<pubkey>:nostr-post:<id>`), resolved from relays (`resolveEntityManifest`), besides a registered id or an inline manifest: pickers and venue fields work in any app, not only where the manifest creator registered its examples
- [ ] Publish `venue-entity-v1` as a NIP-78 manifest and reference it by address in the examples (now registered from the manifest creator's examples)
- [x] Show all data: posts and wiki pages show the clean manifest-based format, with a collapsed full view of everything (all tags; wiki table rows the manifest doesn't know, e.g. fields added in a newer manifest version), instead of always listing raw tags
- [x] Venue hub: Google Maps links without an API key. A pasted link is read from its text (name, point, CID; no request to Google), the place is searched on OSM by name around the point; not on OSM: the author clicks it on the map (zoomed to the link's point, not set), address from OSM's reverse lookup. Kept as `i gcid:<cid>`, the Google Maps link derived when shown; venue pages are found by it too. Not done: a stored Google rating snapshot (Google's terms don't allow storing Places content, even with a key)
- [x] Google's place card in the venue view via the Maps Embed API (free, unlimited): the app sets its key with `configureVenuePlugin({ googleMapsEmbedKey })` (not in manifests, which are public; never shipped with the plugin); venues with a Google link (CID or place ID) show a collapsed "On Google Maps" row whose iframe loads when opened; found by place ID, else name + OSM address. Nothing read or stored; the Places API isn't used
- [ ] Import your own Google Maps reviews and photos from Google Takeout (Reviews.json): your text, stars, date and photos become review events; the place's Google link → `gcid:`, matched to OSM; photos uploaded via the media plugin; Google's place details only used to find the place
- [x] Related sections: review stats, `stats: { tag: 'rating', max: 5 }` → "12 reviews · ★ 4.3" above the list (count + average of that tag over the section's posts; computed when shown, not stored; fetched up to ~500 for the numbers, the list stays at `limit`). For any entity type: a venue's or a beer's reviews
- [x] Related sections: photo gallery, `gallery: true` → the images (`r`/`imeta` tags) of the section's posts, e.g. a venue's or a beer's review photos
- [ ] Venue hub: area search ("venues near me") via the entity's `g` prefix tags
- [x] Venue hub: create a venue entity from an OSM search directly in the wiki picker: plugins register their own "+ Create" form (`registerEntityCreator`); the venue plugin's searches OSM and runs the venue hub
- [x] Venue hub: add btc payment availability from btcmap data. BTC Map's data are OSM tags (`currency:XBT`, `payment:lightning`, `payment:onchain`, `payment:lightning_contactless`, `check_date:currency:XBT`), so `venue-entity-v1` maps them to infobox rows via `sources.osm`. The BTC Map link isn't stored: entity manifests can declare derived links (`wikiConfig.links`, e.g. `https://btcmap.org/merchant/{i:osm}` when `bitcoin` is "yes"), shown in the wiki view's Links row (which also shows `r` URLs). Existing entities get the rows on their next OSM-triggered update
- [x] Self-documenting manifests: fields have a `metadata.description` (what the field means, where its value comes from), shown as help text in the post and wiki composers and as a label tooltip in views, editable in the manifest creator; the examples have descriptions. MANIFEST.md documents every manifest, field, plugin `metadata` and `wikiConfig` key (moved out of the wiki README)
- [x] Manifest creator: edit `wikiConfig.links` (derived links) in the wiki settings
- [ ] Venue hub: BTC Map extras from its API (`api.btcmap.org/v4/places`): verification date as BTC Map computes it, comments, boosts; and a "₿ accepts bitcoin" badge in the venue picker and the review's venue view
- [x] Venue hub: the slug of a new venue page is never qualified automatically (no street or OSM ID): it's an always-editable input next to the publish button ("Wiki page slug (permanent)", the type suffix `-venue` fixed), with ✓ free / used by another venue / couldn't verify, the create/update/link action and the opt-out checkbox. Only when the slug is taken, details (street, district, postcode) are offered to append. A taken slug stops publishing; an "unknown" check is retried once. Generic `publishSummaryTagName` plugin hook renders it
- [x] Venue hub: the wiki view links the entity's external IDs (OpenStreetMap, Google Maps); a post's venue view shows the linked venue wiki page (collapsed, loaded when opened)

### Venue Reviews (from INTEGRATION.md)

- [ ] Search/filter reviews by venue
- [ ] Show reviews on map
- [ ] User profile + review history (built on the `<nostr-profile>` view above, filtered to reviews)
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
- [ ] Use the signer's dry-run mode (`setDryRun`, `getDryRunEntries`) in E2E and `web` tests to assert published bundles without real relays
- [ ] Test mode (dry-run) doesn't work for a post with a venue whose wiki page must be created first (venue hub's `beforePublish` creates or updates the venue entity before the post): find where the chain breaks in dry-run and make the post publish into the test log like other posts
- [ ] Composer: submitting with a required field empty shows the error only next to the field, nothing near the submit button; in a long form the field is off screen and it looks like nothing happened or something broke. Show a summary at the button ("Fill in the required fields: …") and scroll/focus to the first invalid field
- [ ] User testing: get feedback from real-world usage, identify pain points and confusing APIs
- [ ] API stabilization: stabilize the manifest schema, document breaking changes
- [ ] Performance optimizations
- [x] Remove `wss://relay.nostr.band` from `DEFAULT_RELAYS` / `DEFAULT_WIKI_RELAYS` (doesn't respond; every fetch waited ~10 s for it); `DEFAULT_RELAYS` uses `wss://relay.primal.net` instead
- [ ] Fix build, lint and test issues so `pnpm build`, `pnpm lint` and `pnpm -r test` pass cleanly. Done: `pnpm build` passes and Next exports (`**/out`) are ignored by Biome; `pnpm lint` passes with no errors or warnings (example HTML a11y and `sw.js`, unused variables, unsafe optional chaining in tests, accumulating spread in signer, stable keys instead of array indexes in manifest-creator lists, complex functions split: core `validateFieldRelationships` and `resolveManifest`, composer submit, `extractPrefillFromEvent`, `FieldEditor`). Left: 3 e2e tests fail (`tests/e2e/before-publish.test.ts`, two hashtag cases in `plugin-integration.test.ts`); `plugin-list` has no tests (see below)
- [x] Update libraries: Biome 1.9 → 2.5 (config migrated; one-time import sort; import sorting off for package entry points, where it separated section comments from their exports), vitest 5 in all packages, TypeScript 6.0, vite 8 with @vitejs/plugin-react 6, happy-dom 21, jsdom 30, React 19 (react package, wiki, demos, manifest creator; `JSX.IntrinsicElements` moved into `declare module 'react'`), @testing-library/react 16, Next 16.4, nostr-tools 2.25, lit 3.3.3, esbuild 0.28, lefthook 2.2 (`install --force` for the `.husky/_` hooks path). Node ≥ 22.12 (vitest 5), also in CI
- [ ] TypeScript 7 (native compiler): ships no classic JS API (`typescript` exports only its version), which `next build` uses for type checking; update once Next.js supports it
- [ ] Package builds emit `*.test.ts` into `dist/` (tsconfigs include all of `src/`; only core and wiki exclude tests), so tests get published; test scripts use `vitest run --dir src` since vitest 4+ no longer skips `dist/`. Exclude tests from the emit while keeping them type-checked (e.g. a separate `tsconfig.build.json`)
- [ ] Publish the examples and the manifest creator as an nsite (static sites hosted on Nostr/Blossom), e.g. from CI on release
- [ ] Add `llms.txt` (and `llms-full.txt`): a short index of the packages, CDN usage, manifest format and plugin API for AI agents and tools, published with the docs/nsite, add rule to keep them updated
- [ ] Pin `next` in nextjs-demo and manifest-creator (`"latest"` re-resolves on every lockfile change)
- [ ] Rename kebab-case source files to camelCase (AGENTS.md "File names"): `packages/wiki/src/web/wiki-composer*.ts` and `wiki-view*.ts`, `packages/web/src/base-component.ts`, `packages/plugin-venue/src/fixtures.test-helpers.ts`, `tools/manifest-creator/tests/e2e/*-*.test.ts`; update imports and the docs that name them (e.g. AGENTS.md's messages-object example)
- [ ] Replace the `PluginRegistry` class (`packages/plugins/src/registry.ts`, the only class that isn't a custom element) with a module-level map and functions; update plugins, CDN exports and READMEs
- [ ] Prefix private members of custom elements with `_` (AGENTS.md "Style"): the venue input, the post composer and view, and others without it; best together with thinning them
- [ ] Thin the largest web components (AGENTS.md "Style": state and render only): `wiki-composer` (446 lines), `wiki-entity-picker` (444), `nostr-post-composer` (435); move logic and template parts into function modules
- [ ] Bring oversized files under the 500-line limit: plugin-markdown input, web feed, core coordinator (done: web view, plugin-geo input, manifest-creator ManifestEditor and FieldEditor, wiki-composer, plugin-venue input)
- [ ] Venue linking UI improvements (OSM ID deep links)
- [ ] Additional plugins: polls, calendars, markets, date, tags, mentions
- [ ] Plugin examples, plugin developer documentation and plugin validation examples
- [ ] Advanced manifest features (conditions, dependencies)
- [ ] plugin-list: delete the list event from relays when a list is deleted (TODO in `packages/plugin-list/src/web.ts`)
- [ ] `<nostr-post-feed>` array attributes (`kinds`, `authors`, `ids`) only accept JSON (`kinds="[1]"`); `kinds="1,30023"` is silently ignored. Accept comma lists too
- [ ] Docs drift check: a test that every name exported by the CDN bundle (`packages/cdn/src/index.ts`) appears in packages/cdn/README.md; later, if drift keeps happening, a read-only Sonnet docs-check agent (`.claude/agents/`) that compares entry points, component properties and plugin hooks against the READMEs before releases
- [ ] Documentation: API reference for each package, API documentation website, more usage examples, best practices guide, video tutorials
