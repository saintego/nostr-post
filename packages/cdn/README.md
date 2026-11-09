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
| Post menu | `<nostr-post-menu>` (the "⋯" menu of every post; `hide-menu` on the view or feed turns it off; a post in the test-mode log also gets "Publish for real…") |
| Outbox | `<nostr-post-outbox>` (posts published later: drafts, timed posts, upload later; see [@nostr-post/outbox](../outbox/README.md)) |
| Publish a test post | `<nostr-dry-run-publish event-id="…">` (a post from the test-mode log with the logged events it links, e.g. the pages it created: lists them, sends them for real, fires `dry-run-published`; `messages`: `DEFAULT_DRY_RUN_PUBLISH_MESSAGES`) |

Every component shares the look of `@nostr-post/ui` (Material 3 style tokens and primitives) and
follows the page's `--np-*` tokens, `::part()` rules and the `dark` class: see
[packages/ui](../ui/README.md). For your own elements, load its stylesheet too:
`<link rel="stylesheet" href="…/@nostr-post/ui/dist/ui.css">` gives `np-button`, `np-input`, ….

The plugins and their UI elements are also registered:

- **Stars** — `@nostr-post/plugin-stars`
- **Geo** — `@nostr-post/plugin-geo`
- **Date** — `@nostr-post/plugin-date`: dates and times, NIP-52 date tags
- **Calendar** — `@nostr-post/calendar`: `<nostr-calendar-agenda>`, `<nostr-calendar-event>`, RSVP,
  Add to calendar and `.ics` on calendar events
- **Profile** — `@nostr-post/plugin-profile`: people picker (`p` tags with roles)
- **Venue** — `@nostr-post/plugin-venue`
- **Media** — `@nostr-post/plugin-media`
- **Markdown** — `@nostr-post/plugin-markdown`
- **Hashtag** — `@nostr-post/plugin-hashtag`
- **Lists** — `@nostr-post/list`: the `list` field, `<np-list-save target="30818:<pubkey>:<d-tag>">`
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

**Form data as JSON** (e.g. an AI's structured output; see [PLUGINS.md](../../PLUGINS.md#a-posts-form-data-as-json))

- `formJsonSchema(manifest)`: the JSON Schema of a manifest's form data, with the registered plugins' schemas
- `parseFormJson(manifest, input)`: a `Result` with `{ formatId?, formData, suggestions }` from JSON in that
  shape, as text (also wrapped in prose or code fences, as AIs answer) or parsed (e.g. performer names
  turned into their wiki pages)
- `PUBLISH_FORMAT_KEY`: the property holding the chosen publish format
- `findJsonObject(text)`: a `Result` with the JSON object in text (also inside prose or code fences)

**Geo helpers**

- `geoPlugin`
- `encodeGeohash(lat, lon, precision?)`
- `decodeGeohash(hash)`
- `GeoPluginConfig`, `GeoCoordinates`

**People helpers** (see [plugin-profile](../plugin-profile/README.md))

- Embeds: `embedFor(link)` (a link's player), `linkProvider(link)`, `embedPlugin`, `Embed`;
  `profileLink(link)`, `profileUrls(links)`: profile links in canonical form (NIP-73 `i` tags);
  `linkFromEmbedCode(text)`; `checkLink(link)`, `isCheckableLink(link)`, `namesMatch(name, names)`:
  whether a Spotify, SoundCloud or YouTube link exists, and whose it is; `linksInText(text)`,
  `keepKnownLinks(value, text)`, `checkSuggestedLinks(candidates, text)`: keep only links a source
  text has (e.g. in what an AI read from it), check the others
- `profilePlugin`, `personFromText(text)`, `peopleFromTags(tags)`, `personTag(person)`, `Person`
- `mentionsIn(text)`: the people in a text's `nostr:npub…` mentions; the composer completes `@name` in
  text fields with an attached `profile` field (the standard kind 1 post has one)
- `searchProfiles(query, { relays? })`, `profileName(pubkey, profile?)`, `DEFAULT_SEARCH_RELAYS`, `FoundProfile`

**Date field** (see [plugin-date](../plugin-date/README.md))

- `datePlugin`, `formatDateValue(value, locale?)`, `dateValueFromTags(tags, tagName?)`,
  `dayNumbers(value, precision)`, `DateValue`
- `ALL_DAY_EVENT_KIND` (31922), `TIMED_EVENT_KIND` (31923)

**Calendars** (NIP-52, see [calendar](../calendar/README.md))

- `CALENDAR_EVENT_MANIFEST`: calendar event, all-day or timed by publish format
- Agenda: `agendaFilters(query)` (an agenda's relay filters), `agendaFilter(window)`,
  `groupEventsByDay(events, window)`, `eventTiming(event)`, `eventDates(timing, tzid?)`,
  `eventTimeZone(event, window)` (with the window's `eventZones`, events in their own zone),
  `windowDates(window)`, `shiftWindow(window, steps)`, `AgendaWindow`
- Months: `monthWindow(month)`, `monthGrid(month)`, `shiftMonth(month, steps)`, `formatMonth(month)`
- RSVP (kind 31925): `fetchRsvps(addresses)`, `publishRsvp(address, status)`,
  `summarizeRsvps(events, address)`, `rsvpEvent(address, status, pubkey)`, `RsvpStatus`;
  `rsvpsByFilter(pubkey)`, `fetchRsvpsBy(pubkey)`, `answersByAddress(events)`: one person's answers
  by event address
- Calendars (kind 31924): `fetchCalendarItems(address)` (a calendar's event addresses),
  `calendarEventFilters(addresses)`; edited with the list functions and `{ listKind: CALENDAR_LISTS }`
- iCalendar: `eventsToIcs(events, name?)`, `icsToDrafts(text)` (an `.ics` file as drafts for
  CALENDAR_EVENT_MANIFEST, d-tag `ics:<UID>`), `icsDTag(uid)`, `fetchEventsAsIcs(addresses)` (linked pages, e.g. performers, as names), `fetchIcsRefs(addresses)`
- Duplicates: `similarEvents(draft, events)`, `titleSimilarity(a, b)`
- Sharing: `agendaWindowFor(from, days, tzid, view)` (an agenda element's window),
  `agendaSummary(events, window)`, `agendaText(events, window, { title, link })` (a message),
  `agendaImage(summary, { title, footer, dark })` (a PNG), `drawAgendaImage` (the canvas)

**NIP-19**

- `encodeNaddr(address, relays?)`, `decodeNaddr(naddr)`: an address (`kind:pubkey:d-tag`) as `naddr1…` and back
- `encodeNevent(id, { relays, author, kind })`: an event id as `nevent1…`

**Signing & Relays**

- `signEvent`, `signAndPublish`, `publishToRelay`, `publishToRelays` (`signAndPublish` without
  relays publishes to `getPublishRelays` of the signer's pubkey). `publishToRelays` resolves as soon
  as one relay accepted the event; the other relays keep going, and its `all` resolves with every
  relay's answer
- `RELAYS_PENDING_EVENT` (`'nostr-post:relays-pending'`): `window` gets it while events are still
  being sent to relays and when the last send ends (detail `{ pending, sent, failed }`);
  `getRelaysPending()` reads it. `<np-activity>` shows it
- `getPublicKey` (gives up after `PUBKEY_TIMEOUT_MS`, 30 s, when the signer doesn't answer: `isSignerTimeout(error)`), `hasNostrSigner`, `fetchEvents`, `fetchEventsFromRelay`, `relaysSeenOn(id)` (the relays an event was fetched from this session)
- `getUserRelays`, `getDefaultRelays`
- `setDryRun(on)`, `isDryRun()`: test mode. Events are still signed, but publishing only logs them
  (every relay reports success), and reads (`fetchEvents`, feeds, pickers) also return logged
  events that match. `getDryRunEntries()` lists `{ event, relays }` newest first,
  `clearDryRunEntries()` empties the log, `removeDryRunEntries(ids)` removes some; `window` fires
  `DRY_RUN_CHANGE_EVENT` (`'nostr-post:dry-run'`, detail `{ enabled, entries }`) on every change.
  The log is kept in the browser (localStorage, the newest 300 entries), so a reload keeps it.
  Blossom media uploads are not affected.
- Publishing logged events for real (they're signed, so they go as they are): `dryRunEvents()`
  (the log, each event once with all its relays), `dryRunBundle(id)` (a logged post and the
  logged events it links by `a`/`A`/`e`/`E` tags, transitively), `newerOnRelays(entries)` (ids
  that relays have in a newer version), `publishDryRunEntries(entries, fallbackRelays?)` (sends
  them, linked events first, also in test mode; removes the published ones from the log;
  `DryRunPublishResult[]`). `publishToRelay(s)` take `{ ignoreDryRun: true }` for the same.
  `publishSignedEvents(entries, { fallbackRelays?, ignoreDryRun? })` sends any signed events
  that way; `setPublishCapture(handler?)` hands every publish to `handler` instead of the relays
  (the outbox's capture)
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

**Background activity**

- `<np-activity>`: uploads with their progress and relay sends still running, in a corner of the
  page, which stays usable. Added to the page by itself when something starts; place one yourself
  (e.g. inside your `dark` container) to choose where it lives. While relay sends run, leaving the
  page asks first (`beforeunload`; mobile browsers may not ask)
- `startActivity(label, { detail?, blocksPublish?, warnOnLeave?, hidden?, cancel? })` →
  `{ update({ label, detail, progress }), done(label?), fail(detail) }`, `getActivities()`,
  `subscribeActivities(listener)`, `dismissActivity(id)`: report your own background work to it.
  `blocksPublish`: the composer waits for it before publishing (an upload whose link goes into the
  form) and stops if it failed; `warnOnLeave`: the browser asks before the user leaves the page
  while it runs (relay sends have it); `hidden`: not listed, for a component showing it itself;
  `cancel`: shown as ✕ while it runs; your code aborts and calls `dismissActivity(id)`, and a
  dismissed publish blocker no longer holds publishing.
- `onSignInNeeded((reason) => …)`: called when an upload or the composer needs a signed-in user and
  there's none (`reason`: `'upload'` or `'publish'`), e.g. to open your signer's login;
  `requestSignIn(reason)` asks for it from your own code.
  `publishBlockers()`, `waitForPublishBlockers()`: what the composer waits for
- `DEFAULT_ACTIVITY_MESSAGES`, `setActivityMessages(messages)`: its text;
  `DEFAULT_MEDIA_MESSAGES`, `setMediaMessages(messages)`: the media upload's text (Add media, photo
  quality, progress, retries)
- Uploads go to the user's Blossom servers (their kind 10063 list), then a field's
  `blossomServers`, then nostr.build (NIP-98): the next server is tried when one refuses or fails.
  A Blossom upload is authorized once per file (a kind 24242 event for its hash), so its retries
  don't ask the signer again. Location and other metadata are removed from JPEG photos first,
  unless the field keeps them (`keepMetadata: true`).
  `uploadMedia(file, { config })` does the same from your own code and returns what's known about
  the file (url, type, sha256, size, dim); `fetchBlossomServers(pubkey)` reads a user's servers.
- Uploads cope with a bad connection: one with no progress for 30 s is aborted, and failed
  uploads (no connection, stalled, server error) are tried twice more, after 3 s and 10 s or
  once the browser is back online; with nostr.build each try signs a new NIP-98 token, so a remote
  signer may ask again. Running uploads can be cancelled (✕), and publishing then goes on without
  them
- Images from a Blossom server that fail to load are tried on the author's other servers by their
  hash
- Upload later: the media field's "Upload later, on wifi" (offered in a composer with
  `upload-later`, or in every composer after `setComposerDefaults({ uploadLater: true })`, unless the field sets `uploadLater: false`; remembered in the browser) prepares a
  photo instead of uploading it: shrunk, hashed, its Blossom authorization signed for 7 days, its
  final URL known (a Blossom server's: the user's first, else the field's). Without a Blossom
  server (nostr.build chooses the URL) the photo gets a placeholder URL (`pending:<sha256>.<ext>`)
  and nothing is signed: the post is queued unsigned and signed once the photos are up (the
  signer is asked then). Publishing queues the post with its files in the outbox
  (`<nostr-post-outbox>`, composer event `nostr-post-queued`), which uploads them on wifi or on
  "Upload now" and publishes the post after. `prepareUploadLater(file, config)` and `uploadPrepared(upload, file)`
  (the outbox's upload job, registered by the media plugin) do it from your own code

**Composer text**

- `DEFAULT_COMPOSER_MESSAGES`: the composer's submit-area text (button, running step, errors); set
  `composer.messages = { submit: '…' }` to override any of it
- `DEFAULT_EDIT_MESSAGES`: the view's Edit button and edit form (e.g. the note that a non-author's
  changes go out as a suggestion); set `view.messages` to override any of it
- `DEFAULT_SUGGESTION_MESSAGES`: the view's list of others' suggested changes ("Show with this
  change"), also through `view.messages`
- `DEFAULT_FEED_MESSAGES`: the feed's text (loading, empty); set `feed.messages` to
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
- `extractPrefillFromEvent(event, manifest)`: an event's values as form data, to edit it in a
  composer (`prefill`, with the event's `dTag`)
- `rawEventData(event, relays?)`: what a post's "⋯" menu (`<nostr-post-menu>`) copies and shows:
  npub, kind, d tag, tags, naddr/nevent with relay hints, the relays it was found on
  (`relaysSeenOn(id)`), JSON, signature; `eventTitle(event)` a short name for lists (title,
  name, d tag or text)

**Posts without the components** (see [@nostr-post/posts](../posts/README.md))

- `validateAndCoordinate`, `publishWithHooks`, `signAndPublishBundle`, `DEFAULT_PUBLISH_MESSAGES`,
  `PublishMessages`: publishing a post made with a manifest
- `buildReply`, `ReplyTarget`, `buildReplyTarget`, `buildThreads`, `FeedThread`,
  `buildReactionEvent`, `publishReaction`: replies, threads, reactions
- `buildFeedFilters`, `interactionFilters`, `fetchFeedEvents`: feeds and their interactions
- `formatPrefillAsUpdateComment`, `appliedUpdates`: editing with update comments

**Design system**: see [packages/ui](../ui/README.md)

- `registerStyles(tag, css, { mode })`, `unstyled(tag?)`, `clearStyles(tag?)`: add CSS to a
  component (or `'*'`, every component), or replace all its styles
- `installTokens(document?)`: put the `--np-*` tokens into a document (components do it when they
  connect)
- `tokensCss()`, `primitivesCss()`, `uiCss()`: the token and primitive stylesheets as text
- `resolveTokens(mode, overrides?)`: every token as a plain value (for canvas or other UI libraries)
- `npClass`, `npPart`: the primitives' class names and the components' part names

**Wiki (NIP-54)**: see [packages/wiki](../wiki/README.md)

- `WIKI_KIND`, `DEFAULT_WIKI_RELAYS`, `STANDARD_WIKI_MANIFEST`
- `manifestToWikiEvent`, `wikiEventToManifestData`, `unmappedTableRows`, `buildWikiATag`,
  `extractExternalIds`, `externalIdLink`, `entityLinks`, `manifestLinks`, `normalizeDTag`
- `defaultResolver`, `collectEntityATags`, `fetchEntityVersions`, `checkEntityDTag`
- `registerEntityManifest`, `getEntityManifest`, `resolveEntityManifest`: entity manifests by id,
  inline, or by a published manifest's `30078:` address
- `pageLinkValue(page)`: a field value linking a wiki page (for a section's "Add"); the posts linking
  a page come from `fetchSection` with `sectionTarget(versions)`
- Sections (`sections` of a manifest, MANIFEST.md): `fetchSection(section, target)`,
  `sectionFilters`, `matchesSection`, `sectionStats`, `sectionTarget(events)`, `postSnippet(event)`;
  `<nostr-post-sections .sections .target>` shows them (wiki pages and calendar events' pages do;
  `hide-sections` hides them); `registerSectionView({ view, tagName })` adds a view. With
  `.manifest` (the page's or event's own), "Add" offers the pages its fields link (`add.also`) as
  "Also show on" checkboxes: `loadAlsoLinks(section, manifest, address)`, `alsoLinkOptions`,
  `alsoLinkTags(addresses)` (the composer's `extraTags`)
- `selectedFormatFor(manifest, formData)`: the publish format the files picked choose (a format's
  `select`, the plugins' `describeMedia`); the composer switches to it until the author picks one
- `eventMedia(event)`, `mediaOfEvents(events)`: the photos and videos of posts, wherever their kind
  keeps them (`imeta`, `image`, `r`, links, JSON), each file once; `fetchReferences(targets)`: the
  posts referencing addresses or event ids (comments included); `<np-media-gallery>` shows their
  media (a section's `gallery` view); `<np-media-lightbox .slides>` with `open(index)`: photos and
  videos large, with previous/next (buttons, arrow keys, swiping), full screen and close (the
  gallery and `<np-media-view>` open theirs in it; parts `dialog`, `button`)
- `registerEntityCreator({ tagName, matches })`, `entityCreatorFor(manifest)`: a plugin's own "+ Create"
  form in the entity picker for the types it can fill (the venue plugin creates venue pages from OSM)
- `registerEventAction({ tagName, matches })`, `eventActionsFor(manifest)`: a plugin's control shown with
  events made with a manifest, in `<nostr-post-view>` and `<nostr-wiki-view>` (the list plugin's Save button)
- `searchEntities`, `entityTypeAffixes`
- `entityJsonSchema(manifest)`, `resolveEntities(items, { entityManifest, relays })`: entities in form JSON
  (name and links) and their wiki pages, found by link (`#i`) or name; the others as unlinked values
- `createsPage(entity)`, `createEntityPage(entity, field)`: the picker's publish hook: an unlinked
  entity's page is created when the post is published (ticked next to the publish button by
  default when it has links), and the post links it
- `withPageLinks(values, relays?)`: an edited event's picked entities with their own links (`i` tags)
  back, from their pages, so removing one removes its links; the picker does it on edit

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
- `BOOKMARK_LISTS` (default), `CALENDAR_LISTS`, `ListKind`: pass `{ listKind }` to the functions above
  for another kind of list, e.g. NIP-52 calendars (31924)
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

`<nostr-calendar-agenda>` (from `@nostr-post/calendar`, in the bundle) shows calendar events of a
date window under day headings, sorted by when they start, or a month as a grid:

```html
<nostr-calendar-agenda from="2026-10-21" days="7"></nostr-calendar-agenda>
<nostr-calendar-agenda view="month" .tagFilters=${{ '#g': ['u09t'], '#t': ['punk'] }}></nostr-calendar-agenda>
<nostr-calendar-agenda calendar="31924:<pubkey>:<d-tag>"></nostr-calendar-agenda>
```

The days become a `#D` filter, the day tags `@nostr-post/plugin-date` writes, or with `calendar`
the calendar's events are asked for by address. See the [calendar README](../calendar/README.md)
for its attributes. Events keep their comments, reactions and actions: RSVP, Add to calendar and
`.ics`. A post linking a calendar event (`nostr:naddr…`) shows it as `<nostr-calendar-event>`.

`<nostr-post-feed>` itself takes `layout` (how posts are laid out; the agenda is one) and
`trustedEditors` (whose update comments apply besides each post's author and named editors).

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
