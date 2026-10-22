# @nostr-post/cdn

A single-file CDN bundle that includes **all** nostr-post web components and plugins — no npm install, no bundler required. Works like [nostr-login](https://github.com/nicknstr/nostr-login), or [window.nostr.js](https://github.com/fiatjaf/window.nostr.js/): add one `<script>` tag and start using components.

## Quick Start

### ESM (recommended)

```html
<script
  type="module"
  src="https://saintego.github.io/nostr-post/nostr-post.js"
></script>

<nostr-post-composer auto-publish></nostr-post-composer>
```

### Classic `<script>` (IIFE)

```html
<script src="https://saintego.github.io/nostr-post/nostr-post.iife.js"></script>

<nostr-post-composer auto-publish></nostr-post-composer>
```

The IIFE build exposes a global `NostrPost` object for programmatic access.

## What's Included

Loading the bundle automatically registers every custom element:

| Component | Tag                     |
| --------- | ----------------------- |
| Composer  | `<nostr-post-composer>` |
| View      | `<nostr-post-view>`     |
| Feed      | `<nostr-post-feed>`     |

The plugins and their UI elements are also registered:

- **Stars** — `@nostr-post/plugin-stars`
- **Geo** — `@nostr-post/plugin-geo`
- **Date** — `@nostr-post/plugin-date`: dates and times, NIP-52 calendar event tags
- **Venue** — `@nostr-post/plugin-venue`
- **Media** — `@nostr-post/plugin-media`
- **Markdown** — `@nostr-post/plugin-markdown`
- **Hashtag** — `@nostr-post/plugin-hashtag`
- **Lists** — `@nostr-post/plugin-list`: the `list` field, `<np-list-save target="30818:<pubkey>:<d-tag>">`
  (Save to the user's lists; also on events made with manifests that have `lists`) and
  `<np-list-view>` (the user's lists, or one list by `address`)

## Programmatic API

The bundle re-exports utilities for advanced usage:

### ESM

```html
<script type="module">
  import {
    pluginRegistry,
    signAndPublish,
    getUserRelays,
    validateManifest,
    encodeGeohash,
  } from "https://saintego.github.io/nostr-post/nostr-post.js";

  const relays = await getUserRelays();
  console.log("User relays:", relays);
  console.log("NYC geohash:", encodeGeohash(40.7128, -74.006, 6));
</script>
```

### IIFE

```html
<script src="https://saintego.github.io/nostr-post/nostr-post.iife.js"></script>
<script>
  const { pluginRegistry, signAndPublish, getUserRelays, decodeGeohash } =
    NostrPost;

  console.log(decodeGeohash("dr5reg"));
</script>
```

### Available Exports

**Core**

- `validateManifest`, `getFieldsByKind`, `getUsedKinds`, `findFieldById`, `getRequiredFields`
- `fieldLabel(field)`, `fieldDescription(field)`: a field's label and description (see [MANIFEST.md](../../MANIFEST.md#field-metadata))
- `fieldOptionLabel(field, value)`, `groupFieldOptions(field)`, `matchFieldOption(field, text)`: an enum field's option labels and groups, and the option a stored text stands for (see [MANIFEST.md](../../MANIFEST.md#enum-options))
- `coordinateEvents`, `validateFormData`

**Plugin Registry**

- `pluginRegistry`

**Geo helpers**

- `geoPlugin`
- `encodeGeohash(lat, lon, precision?)`
- `decodeGeohash(hash)`
- `GeoPluginConfig`, `GeoCoordinates`

**Date helpers** (NIP-52 calendar event dates, see [plugin-date](../plugin-date/README.md))

- `datePlugin`
- `CALENDAR_EVENT_MANIFEST`: NIP-52 calendar event, all-day or timed by publish format
- `formatDateValue(value, locale?)`, `dateValueFromTags(tags, tagName?)`, `dayNumbers(value, precision)`
- `ALL_DAY_EVENT_KIND` (31922), `TIMED_EVENT_KIND` (31923)
- Agenda: `agendaFilter(window)` (relay filter of a date window), `groupEventsByDay(events, window)`,
  `eventTiming(event)`, `eventDates(timing, tzid?)`, `windowDates(window)`, `shiftWindow(window, steps)`,
  `AgendaWindow`
- RSVP (kind 31925): `fetchRsvps(addresses)`, `publishRsvp(address, status)`,
  `summarizeRsvps(events, address)`, `rsvpEvent(address, status, pubkey)`, `RsvpStatus`
- `DateValue`

**Signing & Relays**

- `signEvent`, `signAndPublish`, `publishToRelay`, `publishToRelays` (`signAndPublish` without
  relays publishes to `getPublishRelays` of the signer's pubkey)
- `getPublicKey`, `hasNostrSigner`, `fetchEvents`, `fetchEventsFromRelay`
- `getUserRelays`, `getDefaultRelays`
- `setDryRun(on)`, `isDryRun()`: test mode. Events are still signed, but publishing only logs them
  (every relay reports success), and reads (`fetchEvents`, feeds, pickers) also return logged
  events that match. `getDryRunEntries()` lists `{ event, relays }` newest first,
  `clearDryRunEntries()` empties the log; `window` fires `DRY_RUN_CHANGE_EVENT`
  (`'nostr-post:dry-run'`, detail `{ enabled, entries }`) on every change. Blossom media uploads
  are not affected.
- `fetchUserRelays(pubkeys, relays?)`: the NIP-65 relays of one or more users plus `relays`
  (default: `DEFAULT_RELAYS`); falls back to `relays` when no list is found
- `getPublishRelays(pubkey, relays?)`: where to publish: the signer's write relays, the user's NIP-65 write relays and `relays` (default: `DEFAULT_RELAYS`)
- `SIGNING_EVENT` (`'nostr-post:signing'`): `window` gets it when `signEvent` starts or stops waiting
  for the signer (detail `{ pending, kind? }`, `pending` 0 when done), e.g. to show "waiting for
  approval"; the composer uses it
- `fetchProfile(pubkey, { relays?, hints? })`, `fetchProfiles(pubkeys, { relays?, hints? })`: user
  profiles (newest kind 0) from `relays` (default: `DEFAULT_RELAYS`), the `INDEXER_RELAYS`
  (`wss://purplepag.es`) and up to 4 `hints` (e.g. an `nprofile`'s relays). Shared cache:
  lookups in one tick go out as one request, a pubkey being fetched isn't asked for twice, and
  one that wasn't found is tried again next time. `getCachedProfile(pubkey)` reads the cache.
  The view and feed use them for author and mention names

**Composer text**

- `DEFAULT_COMPOSER_MESSAGES`: the composer's submit-area text (button, running step, errors); set
  `composer.messages = { submit: '…' }` to override any of it
- `DEFAULT_FEED_MESSAGES`: the feed's text (loading, empty, agenda buttons); set `feed.messages` to
  override any of it

**Publishing a submitted post yourself** (composer without `auto-publish`)

- `runPublishHooks(manifest, formData, pubkey)`: like `runBeforePublish`, plus the form data with each
  field's linked wiki page, to build the post again before signing (a role's mention line needs it)
- `runBeforePublish(manifest, formData, pubkey)`: runs plugin publish hooks (e.g. the venue's wiki
  page), returns tags for the post
- `withTags(bundle, tags)`: adds them to every event of the submitted bundle
- `runAfterPublish(manifest, formData, { pubkey, events })`: once the post is published, runs plugins'
  after-publish steps (e.g. the list field saving the venue to lists) with the form data
  `runPublishHooks` returned; returns the errors of those that failed

**Wiki (NIP-54)**: see [packages/wiki](../wiki/README.md)

- `WIKI_KIND`, `DEFAULT_WIKI_RELAYS`, `STANDARD_WIKI_MANIFEST`
- `manifestToWikiEvent`, `wikiEventToManifestData`, `unmappedTableRows`, `buildWikiATag`,
  `extractExternalIds`, `externalIdLink`, `entityLinks`, `manifestLinks`, `normalizeDTag`
- `defaultResolver`, `collectEntityATags`, `fetchEntityVersions`, `checkEntityDTag`
- `registerEntityManifest`, `getEntityManifest`, `resolveEntityManifest`: entity manifests by id,
  inline, or by a published manifest's `30078:` address
- `fetchRelated(dTag, section)`, `filterRelated(events, section, dTag)`, `relatedSnippet(event)`,
  `relatedStats(events, tag)`, `relatedImages(events)`: an entity's
  related items (`wikiConfig.related`, e.g. a brewery's beers), as `<nostr-wiki-related>` lists them
- `registerEntityCreator({ tagName, matches })`, `entityCreatorFor(manifest)`: a plugin's own "+ Create"
  form in the entity picker for the types it can fill (the venue plugin creates venue pages from OSM)
- `registerEventAction({ tagName, matches })`, `eventActionsFor(manifest)`: a plugin's control shown with
  events made with a manifest, in `<nostr-post-view>` and `<nostr-wiki-view>` (the list plugin's Save button)
- `searchEntities`, `entityTypeAffixes`

**Venues and the venue hub**

- `searchNominatim`, `fetchOsmElement`, `findVenueEntity`, `syncVenueEntity`
- `configureVenuePlugin({ googleMapsEmbedKey })`: the app's Google Maps Embed API key (free, restrict it to
  your domain); venues with a Google link then show Google's place card (name, address, rating), loaded
  when opened, nothing stored. Keep keys out of manifests: they're public on Nostr

**Bookmark lists (NIP-51)**

- `fetchMyLists({ relays? })`, `fetchLists(pubkey, { relays? })`: the bookmarks list (kind 10003, empty
  until first used) and bookmark sets (kind 30003), without deleted ones
- `addToList(list, item)`, `removeFromList(list, item)`, `createList({ title, description?, items? })`,
  `deleteList(list)`: publish through the signer (test mode applies); they return a `Result`
- `itemFor(addressOrId)`, `hasItem(list, item)`: wiki entities count as one item whichever author's
  version was saved
- `listField({ saveField, label })`: a `list` field for a manifest
- `itemsToSave(field, { formData, events })`, `saveToChoices(choices, items)`: what a `list` field saves
  after publishing, and saving it (its `afterPublish` hook)

**Manifest helpers (preload & cache)**

- `fetchManifestByATag(aTag, relays?, fallbackToD?)` — Resolve a NIP-78 `a:` tag and return a `StoredManifest` (cached).
- `fetchManifestsByATags(aTags[], relays?, fallbackToD?)` — Batch fetch many aTags.
- `fetchManifestForEvent(event, { relays?, registered? })` — The manifest a post or wiki page was made
  with: its `a` address, else by its manifest label (`registered(id)`, then any author's,
  only when it fits the event); `{ manifest, source, pubkey? }` or undefined.
- `getCachedManifest(aTag)` — Synchronously read the in-memory manifest cache.
- `clearManifestCache(aTag?)` — Clear cache for a specific `aTag` or the whole cache.

These are re-exported from `@nostr-post/signer` and are available from both the ESM and IIFE CDN bundles.

### Preloading a manifest (recommended)

If your page programmatically inserts a `<nostr-post-composer>` (for example when using `innerHTML` or client-side rendering), preload the manifest first.

ESM example (recommended):

```html
<script type="module">
  import { fetchManifestByATag } from "https://saintego.github.io/nostr-post/nostr-post.js";

  // Optional: preload the manifest into the in-memory cache so the composer
  // can resolve it synchronously from `manifest-ref` when created.
  await fetchManifestByATag("30078:..." /* aTag */);
  document.body.appendChild(el);
</script>
```

IIFE/global example:

```html
<script src="https://saintego.github.io/nostr-post/nostr-post.iife.js"></script>
<script>
  const { fetchManifestByATag } = window.NostrPost;
  // Optional: preload into the cache first so the composer reads it from cache.
  fetchManifestByATag("30078:...");
</script>
```

Note: importing the same ESM bundle URL multiple times is safe — the browser will instantiate the module once and reuse it for subsequent imports. Avoid loading both the ESM and IIFE bundles simultaneously.

## Full Example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>nostr-post CDN Demo</title>
    <script
      type="module"
      src="https://saintego.github.io/nostr-post/nostr-post.js"
    ></script>
    <style>
      body {
        font-family: system-ui;
        max-width: 640px;
        margin: 2rem auto;
      }
    </style>
  </head>
  <body>
    <h1>Compose a Post</h1>
    <nostr-post-composer auto-publish></nostr-post-composer>

    <h2>Recent Posts</h2>
    <nostr-post-feed></nostr-post-feed>
  </body>
</html>
```

## Self-Hosting

Build the bundle locally:

```bash
pnpm install
pnpm build            # build all workspace packages
cd packages/cdn
pnpm build            # outputs dist/nostr-post.js + dist/nostr-post.iife.js
```

Serve the `dist/` folder from any static host. The GitHub Actions workflow (`.github/workflows/cdn.yml`) deploys automatically to GitHub Pages on every push to `main`.

## Local Pages Preview (Regression Check)

Build the same artifact that gets deployed to GitHub Pages, including all examples:

```bash
pnpm build:pages
```

This creates `.pages-local/` with:

- CDN bundles (`nostr-post.js`, `nostr-post.iife.js`)
- `manifest-creator/`
- `examples/basic/`
- `examples/react-demo/`
- `examples/nextjs-demo/`

Preview locally:

```bash
pnpm preview:pages
```

Then open:

- `/` (CDN landing)
- `/examples/` (examples index)
- `/manifest-creator/`

## PR Previews (nsite)

`.github/workflows/pr-preview.yml` deploys the same `.pages-local/` tree for every pull request as a
named [nsite](https://github.com/nostr-protocol/nips/blob/master/5A.md) (d tag `pr-<number>`) and
comments its URL on the PR. Pushes that change only Markdown files keep the current preview. Closing
the PR replaces the preview with a "preview removed" page (relay.nsite.lol, which the nsite.lol
gateway reads, ignores deletion requests) and deletes it on relays that accept deletions; the
gateway may cache pages for up to an hour. It needs a key used only for
previews: its signing secret (nsec or nbunksec) as the `NSITE_PREVIEW_SEC` secret, and its public
key (npub or hex) as the `NSITE_PREVIEW_PUBKEY` variable; the workflow file lists the optional settings.
PRs from forks get no preview.

## Development

Watch mode rebuilds on file changes (ESM only, unminified):

```bash
cd packages/cdn
pnpm dev
```

## Bundle Size

| Format | Raw     | Gzipped |
| ------ | ------- | ------- |
| ESM    | ~267 KB | ~72 KB  |
| IIFE   | ~267 KB | ~72 KB  |

## Filtering <nostr-post-feed>

`<nostr-post-feed>` now forwards feed filters directly into Nostr `REQ` filters.

### Supported Filters

- `authors: string[]`
- `kinds: number[]`
- `ids: string[]`
- `since: number` (unix timestamp)
- `until: number` (unix timestamp)
- `limit: number`
- `search: string` (relay-dependent, NIP-50)
- `tagFilters: Record<'#tag', string[]>`
- `filter-tags` attribute (string form for tag filters)
- `filters: FetchFilter[]` (advanced: send multiple REQ filter objects)

### Universal Tag Filters (`#<tag>`)

Use either `tagFilters` (object) or `filter-tags` (attribute string):

```html
<nostr-post-feed
  .tagFilters=${{ '#g': ['u09tvw'], '#i': ['osm:node:123'] }}
  limit="20"
></nostr-post-feed>
```

```html
<nostr-post-feed
  filter-tags="#g:u09tvw,#i:osm:node:123"
  limit="20"
></nostr-post-feed>
```

This rewrites to a relay query like:

```json
{ "kinds": [1], "limit": 20, "#g": ["u09tvw"], "#i": ["osm:node:123"] }
```

### Geohash and OSM Examples

```html
<nostr-post-feed filter-tags="#g:u09tvw" limit="20"></nostr-post-feed>
<nostr-post-feed filter-tags="#i:osm:node:123" limit="20"></nostr-post-feed>
```

### Agenda (NIP-52 calendar events)

With `agenda`, the feed shows calendar events of a date window under day headings, sorted by
when they start (not when they were posted). Each version of an event counts once.

```html
<nostr-post-feed agenda agenda-from="2026-10-21" agenda-days="7"></nostr-post-feed>
```

- `agenda-from`: first day, `YYYY-MM-DD` (default today); `agenda-days`: number of days (default 30)
- `time-zone`: IANA time zone of the days (default the viewer's)
- Kinds: `kinds`, else the manifest's, else 31922 and 31923; `limit` defaults to 500 here
- Other filters (`authors`, `tagFilters`, …) narrow it down; `filters` replaces the agenda's filter
- Previous / Today / Next buttons move the window; the feed then fires `nostr-post-agenda-change`
  with `{ from, days }` (`from` undefined: today)
- With a calendar manifest, each event shows Going / Maybe / Can't go with counts (`<np-rsvp>`)

The days become a `#D` filter, the day tags `@nostr-post/plugin-date` writes:

```json
{ "kinds": [31922, 31923], "limit": 500, "#D": ["20746", "20747", "…"] }
```

All-day events from clients that don't write `D` tags aren't found this way.

### Advanced: Multiple REQ Filters

```html
<script type="module">
  const feed = document.querySelector("nostr-post-feed");
  feed.filters = [
    { kinds: [1], "#g": ["u09tvw"], limit: 20 },
    { kinds: [30023], "#t": ["review"], limit: 20 },
  ];
</script>
```

Relays receive one `REQ` with multiple filter objects:

```json
[
  "REQ",
  "subId",
  { "kinds": [1], "#g": ["u09tvw"] },
  { "kinds": [30023], "#t": ["review"] }
]
```

See [plugin-geo](../plugin-geo/README.md) and [plugin-venue](../plugin-venue/README.md) for details on emitted tags.
