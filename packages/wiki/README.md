# @nostr-post/wiki

NIP-54 collaborative wiki entities (`kind:30818`) for the `nostr-post` ecosystem.

---

## Table of contents

- [What are wiki entities?](#what-are-wiki-entities)
- [Quick start (CDN)](#quick-start-cdn)
- [Installation](#installation)
- [Entity manifest](#entity-manifest)
  - [Title and d-tag templates](#title-and-d-tag-templates)
  - [Derived links](#derived-links)
  - [Unknown and newer fields](#unknown-and-newer-fields)
- [Referencing entity manifests](#referencing-entity-manifests)
- [Example: the venue hub (OpenStreetMap)](#example-the-venue-hub-openstreetmap)
- [Review manifest](#review-manifest)
- [Two-hop review queries](#two-hop-review-queries)
- [Web components](#web-components)
- [React wrappers](#react-wrappers)
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Resolver customisation](#resolver-customisation)

---

## What are wiki entities?

| Feature        | NIP-78 (kind:30078)         | NIP-54 (kind:30818)               |
| -------------- | --------------------------- | --------------------------------- |
| Purpose        | App-private structured data | **Collaborative wiki pages**      |
| Authorship     | Single pubkey               | **Any pubkey** can contribute     |
| Resolution     | Latest event wins           | Custom resolver (newest, WoT, …)  |
| Content format | JSON in content             | **Djot** prose + structured table |
| Discovery      | `#d` filter                 | `#d`, `#t`, `#i` (external IDs)   |

A wiki entity is a collaborative document where **many pubkeys each publish their own version** of a `kind:30818` event with the same `d-tag` slug. Clients run a _resolver_ to pick the canonical version. A review or rating then cites the entity via `["a", "30818:<pubkey>:<dTag>"]` tags.

---

## Quick start (CDN)

```html
<!-- 1. Load the bundle (registers all custom elements) -->
<script
  type="module"
  src="https://saintego.github.io/nostr-post/nostr-post.js"
></script>

<!-- 2. Define your manifest -->
<script>
  const BEER_MANIFEST = {
    id: "beer-entity-v1",
    version: "1.0.0",
    fields: [
      {
        id: "title",
        type: "string",
        uiPlugin: "text",
        required: true,
        mapTo: { kind: 30818, target: "tag", tagName: "title" },
      },
      {
        id: "style",
        type: "string",
        uiPlugin: "text",
        mapTo: { kind: 30818, target: "tag", tagName: "t" },
      },
      {
        id: "abv",
        type: "number",
        uiPlugin: "number",
        mapTo: { kind: 30818, target: "table" },
      },
      {
        id: "description",
        type: "string",
        uiPlugin: "textarea",
        mapTo: { kind: 30818, target: "content" },
      },
    ],
  };
</script>

<!-- 3. Drop in the elements -->
<nostr-wiki-view id="view" entity-id="pliny-the-elder"></nostr-wiki-view>
<nostr-wiki-composer id="composer" auto-publish></nostr-wiki-composer>

<script type="module">
  document.getElementById("view").manifest = BEER_MANIFEST;
  document.getElementById("composer").manifest = BEER_MANIFEST;
</script>
```

---

## Installation

```bash
# pnpm
pnpm add @nostr-post/wiki

# npm
npm install @nostr-post/wiki
```

### Subpath exports

| Import                   | Contents                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `@nostr-post/wiki`       | Coordinator functions, types                                 |
| `@nostr-post/wiki/web`   | `<nostr-wiki-view>` and `<nostr-wiki-composer>` Lit elements |
| `@nostr-post/wiki/react` | `<WikiView>` and `<WikiComposer>` React wrappers             |

---

## Entity manifest

Define the shape of your entity. Each field's `mapTo.target` determines where its data lives:

| `target`    | Where data is stored                                | Use for                                               |
| ----------- | --------------------------------------------------- | ----------------------------------------------------- |
| `'tag'`     | Nostr event `tags` array only — relay-filterable    | `title`, `t` (style), `a` (cross-refs), `i` (ext IDs) |
| `'table'`   | A row in a Djot pipe table in `content` — not a tag | Numeric/structured fields: ABV, IBU, city, country    |
| `'content'` | Prose text appended after the table in `content`    | Description, notes, free text                         |

Each field goes to exactly one location — no duplication.

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

export const BEER_MANIFEST: NostrPostManifest = {
  id: "beer-entity-v1",
  version: "1.0.0",
  fields: [
    {
      id: "title",
      type: "string",
      uiPlugin: "text",
      required: true,
      mapTo: { kind: 30818, target: "tag", tagName: "title" },
      metadata: { label: "Beer Name" },
    },
    {
      id: "style",
      type: "enum",
      uiPlugin: "select",
      options: ["IPA", "Double IPA", "Stout", "Lager"],
      mapTo: { kind: 30818, target: "tag", tagName: "t" },
      metadata: { label: "Style" },
    },
    {
      id: "abv",
      type: "number",
      uiPlugin: "number",
      mapTo: { kind: 30818, target: "table" },
      metadata: { label: "ABV %" },
    },
    {
      id: "ibu",
      type: "number",
      uiPlugin: "number",
      mapTo: { kind: 30818, target: "table" },
      metadata: { label: "IBU" },
    },
    {
      id: "external_ids",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30818, target: "tag", tagName: "i" },
      metadata: { label: "External IDs", placeholder: "untappd:beer:4892" },
    },
    {
      id: "description",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 30818, target: "content" },
      metadata: { label: "Description (Djot)" },
    },
  ],
};
```

### Title and d-tag templates

Entity slugs share one NIP-54 namespace with every wiki article, so a beer called "Bitcoin" would
collide with the article about Bitcoin. A `wikiConfig` (type `WikiManifest`) scopes them:

```typescript
const BEER_MANIFEST: WikiManifest = {
  id: "beer-entity-v1",
  version: "1.0.0",
  wikiConfig: {
    titleTemplate: "{name} (Beer)", // => "Bitcoin (Beer)"
    dTagTemplate: "{name}-(beer)", //  => "bitcoin-beer"
  },
  fields: [/* … */],
};
```

- `{fieldId}` is replaced by the field's value. For a reference field (a picked entity) it's the
  entity's name. Static text is kept, and the d-tag is normalized with `normalizeDTag`.
- Without `dTagTemplate`, the d-tag is derived from the title.
- When the slug is taken by another entity, the composer asks for a distinguishing detail (the
  qualifier). The detail goes into the name part of both the title and the d-tag, e.g.
  `bitcoin-moonshine-beer`. Slugs are never changed automatically.
  - `entityDTagFor(manifest, formData, qualifier?)` and `entityTitleFor(…)` compute them.
  - `checkEntityDTag(dTag, relays?)` reports `'free' | 'taken' | 'unknown'`.
  - `distinguishingSuggestions(manifest, formData)` lists details taken from the form's values.
  - `entityTypeAffixes(manifest)` returns the fixed prefix and suffix around the editable name.

### Derived links

`wikiConfig.links` adds links worked out from an entity's data when it's shown. They aren't stored
on the event, so a site changing its URLs needs only a manifest update.

```typescript
wikiConfig: {
  links: [
    {
      label: "BTC Map",
      url: "https://btcmap.org/merchant/{i:osm}", // {i:osm}: the osm: i tag without prefix → node:123
      when: { field: "bitcoin", equals: "yes" }, // optional condition on a field's value
    },
  ],
}
```

`{fieldId}` placeholders take a field's value (URL-encoded). A link is left out when a placeholder
has no value or the condition fails. `manifestLinks(manifest, tags, formData)` computes them.

### Unknown and newer fields

Readers may have an older manifest than the writer. `wikiEventToManifestData` reads the fields the
manifest knows. `unmappedTableRows(event, manifest)` returns the infobox rows it doesn't, and
`<nostr-wiki-view>` shows them under "All data". Nothing is lost.

### Generated Nostr event

```json
{
  "kind": 30818,
  "tags": [
    ["d", "pliny-the-elder"],
    ["title", "Pliny the Elder"],
    ["t", "Double IPA"],
    ["i", "untappd:beer:4892"]
  ],
  "content": "| Field | Value |\n|-------|-------|\n| ABV % | 8.0 |\n| IBU   | 100   |\n\nA legendary West Coast Double IPA brewed by Russian River Brewing Company."
}
```

The table's separator row has no inner spaces (`|---|---|`): Djot reads `| --- |` as a data row.
Tables written that way by older versions are still read correctly.

---

## Referencing entity manifests

Fields that point to an entity type, i.e. the picker's `metadata.entityManifest` and the venue
field's `metadata.wikiEntity`, take an `EntityManifestRef`. Any app can resolve one:

- **A published manifest's address** (`30078:<pubkey>:nostr-post:<id>`): fetched from relays with
  `resolveEntityManifest(ref)` and remembered. This makes custom entity types work without any
  setup code.
- **An inline manifest object.**
- **An id registered with `registerEntityManifest(manifest)`**: app-local, e.g. for examples.

`getEntityManifest(ref)` returns an already-known manifest synchronously. Without a manifest,
`<nostr-wiki-view>` uses `STANDARD_WIKI_MANIFEST`, which shows the article text.

## Example: the venue hub (OpenStreetMap)

`@nostr-post/plugin-venue` uses a wiki entity as the hub for a venue's data. When a venue field
has `metadata.wikiEntity`, publishing a review also creates the venue's entity from OpenStreetMap.
If the entity exists and OSM has a newer version, it's updated instead. The review links to it with
an `a` tag.

- Entity fields declare their source with `metadata.sources: { osm: "<osm key>" }`. Alternatives
  are separated by `|`, and `@name`, `@street` and `@city` come from the address. Updates replace
  only these fields; community fields and prose are kept.
- The entity carries every external ID as an `i` tag (`osm:node:123`), a geohash with its prefixes
  (`g`), and `["source", "OpenStreetMap", <copyright URL>, "node/123/v42"]` for attribution and
  for the imported version.
- Bitcoin payments come from the OSM tags [BTC Map](https://btcmap.org) uses (`currency:XBT`,
  `payment:lightning`, `payment:onchain`, `payment:lightning_contactless`, `check_date:currency:XBT`).
  The example manifest maps them to infobox rows, and its `wikiConfig.links` shows a BTC Map link
  for places that accept bitcoin (see [Derived links](#derived-links)).
- Next to the publish button, the composer shows what will happen, an editable slug and an
  opt-out checkbox. This uses the plugin hooks `beforePublish` and `publishSummaryTagName`
  (see [PLUGINS.md](../../PLUGINS.md)).
- The hooks run when `<nostr-post-composer auto-publish>` publishes the review. An app that
  publishes `nostr-post-submit` itself calls `runBeforePublish` (see the
  [composer docs](../../USAGE_GUIDE.md#nostr-post-composer)); otherwise no wiki page is created.
- API: `findVenueEntity`, `planVenueEntity`, `syncVenueEntity`, `fetchOsmElement`.

---

## Review manifest

Reviews cite the wiki entity using the `wiki-entity-picker` plugin. The picker emits an `["a", "30818:<pubkey>:<dTag>"]` tag and copies all `i` (external ID) tags from the entity for cross-platform discovery.

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

export const BEER_REVIEW_MANIFEST: NostrPostManifest = {
  id: "beer-review-v1",
  version: "1.0.0",
  fields: [
    {
      id: "beer",
      type: "ref",
      uiPlugin: "wiki-entity-picker", // registered by @nostr-post/plugin-wiki-entity
      required: true,
      mapTo: { kind: 1, target: "tag", tagName: "a" },
      // The entity type: its manifest's 30078: address, a registered id, or the manifest itself
      metadata: { label: "Beer", entityManifest: "beer-entity-v1" },
    },
    {
      id: "rating",
      type: "number",
      uiPlugin: "stars",
      mapTo: { kind: 1, target: "tag", tagName: "rating" },
      metadata: { label: "Rating", max: 5 },
    },
    {
      id: "review_text",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 1, target: "content" },
      required: true,
      metadata: { label: "Review" },
    },
  ],
};
```

---

### Picker settings (`metadata`)

| Key               | Default               | Description                                                                                                    |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `entityManifest`  | none                  | The entity type ([reference](#referencing-entity-manifests)). Limits search to that type and enables "+ Create" |
| `relays`          | `DEFAULT_WIKI_RELAYS` | Relays to search                                                                                               |
| `minSearchLength` | `2`                   | Characters before searching                                                                                    |
| `emitExtraTags`   | `true`                | `false`: don't copy the entity's `i` tags into the post (e.g. when one entity references another)               |

Without `entityManifest` the picker searches all wiki articles and can't create entities.

---

## Two-hop review queries

Because **many pubkeys** can each publish a `kind:30818` for the same slug, a review might cite any of their `a` tags. Use `collectEntityATags` to aggregate all canonical `a` values before querying:

```typescript
import { fetchEvents } from "@nostr-post/signer";
import { collectEntityATags } from "@nostr-post/wiki";

// Step 1 — find all pubkeys that published this entity
const entities = await fetchEvents({
  kinds: [30818],
  "#d": ["pliny-the-elder"],
});

// Step 2 — collect every "30818:<pubkey>:<dTag>" string
const aTags = collectEntityATags(entities);
// => ["30818:ab12…:pliny-the-elder", "30818:ef34…:pliny-the-elder", …]

// Step 3 — fetch all reviews that cited any version
const reviews = await fetchEvents({ "#a": aTags });
```

---

## Web components

### `<nostr-wiki-view>`

Displays a resolved wiki entity as a read-only infobox and its article, with:
- a Links row: external IDs (OpenStreetMap, Google Maps, …), `r` URL tags and the manifest's
  [derived links](#derived-links);
- the attribution line from a `source` tag;
- contributors and all versions;
- a collapsed "All data" section: infobox rows the manifest doesn't know, all tags and the source.

| Attribute / Property        | Type                        | Description                                                   |
| --------------------------- | --------------------------- | ------------------------------------------------------------- |
| `entity-id` / `entityId`    | `string`                    | Entity d-tag (slug) to load                                   |
| `entity-i-id` / `entityIId` | `string`                    | External ID to look up (`i` tag) — triggers two-hop query     |
| `manifest`                  | `NostrPostManifest`         | Field definitions; defaults to `STANDARD_WIKI_MANIFEST`       |
| `event`                     | `WikiEvent`                 | Show this version instead of fetching (property only)         |
| `relays`                    | `string[]`                  | Override relay list (property only)                           |
| `resolver`                  | `WikiResolverFunction`      | Custom resolver (property only)                               |
| `messages`                  | `Partial<WikiViewMessages>` | Override user-facing text, e.g. translations (property only)  |

The English defaults are exported from `@nostr-post/wiki/web` as `DEFAULT_WIKI_VIEW_MESSAGES` and
`DEFAULT_WIKI_COMPOSER_MESSAGES` (types `WikiViewMessages`, `WikiComposerMessages`).

**Slots:**

| Slot      | Shown when      |
| --------- | --------------- |
| `loading` | Fetching events |
| `empty`   | No events found |
| `error`   | Fetch failed    |

### `<nostr-wiki-composer>`

A form for creating or editing a wiki entity. Pre-fills from the resolved event when `entityId` is set.

| Attribute / Property           | Type                | Description                               |
| ------------------------------ | ------------------- | ----------------------------------------- |
| `entity-id` / `entityId`       | `string`                        | Existing entity to pre-fill and fork                          |
| `manifest`                     | `NostrPostManifest`             | Field definitions (property only)                             |
| `baseEvent`                    | `WikiEvent`                     | Edit from this version instead of the newest (property only)  |
| `prefill`                      | `Record<string, unknown>`       | Initial values for a new entity (property only)               |
| `relays`                       | `string[]`                      | Relays to load from and publish to (property only)            |
| `auto-publish` / `autoPublish` | `boolean`                       | Publish automatically using NIP-07 signer                     |
| `messages`                     | `Partial<WikiComposerMessages>` | Override user-facing text, e.g. translations (property only)  |

Publishing goes to `relays` plus the author's own relays (NIP-65). For a new entity the composer
checks that the slug is free and asks for a distinguishing detail when it isn't.

**Events emitted:**

| Event                     | `detail`             | Description                                        |
| ------------------------- | -------------------- | -------------------------------------------------- |
| `nostr-wiki-submit`       | `{ event }`          | Unsigned event ready (when `autoPublish` is false) |
| `nostr-wiki-published`    | `{ event }`          | Event signed and published                         |
| `nostr-wiki-error`        | `{ error }`          | Error during sign/publish                          |
| `nostr-wiki-field-change` | `{ fieldId, value }` | A field value changed                              |

---

## React wrappers

```tsx
import { WikiView, WikiComposer } from "@nostr-post/wiki/react";

function App() {
  return (
    <>
      <WikiView entityId="pliny-the-elder" manifest={BEER_MANIFEST} />
      <WikiComposer
        entityId="pliny-the-elder"
        manifest={BEER_MANIFEST}
        autoPublish
        onPublished={(event) => console.log("Published!", event)}
      />
    </>
  );
}
```

---

## API reference

### `manifestToWikiEvent(manifest, formData, config?)`

Converts a manifest + user-filled form data into an unsigned `kind:30818` Nostr event.

```typescript
function manifestToWikiEvent(
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  config?: WikiEventConfig,
): UnsignedNostrEvent;

interface WikiEventConfig {
  dTag?: string; // override the d-tag slug (default: from wikiConfig templates, else the title)
  title?: string; // override the title tag
  pubkey?: string;
  createdAt?: number;
}
```

### `wikiEventToManifestData(event, manifest)`

Parses a `kind:30818` event back into a plain object keyed by field IDs. Each field is read from its canonical location — `target: 'tag'` fields from the event tags, `target: 'table'` fields from the Djot table in `content`, `target: 'content'` fields from prose. Also returns `__dTag` for building `a` tags.

```typescript
function wikiEventToManifestData(
  event: WikiEvent,
  manifest: NostrPostManifest,
): Record<string, unknown>;
```

### `unmappedTableRows(event, manifest)`

Infobox rows whose key is neither a field id nor a label of the manifest's `table` fields, as
`[key, value]` pairs.

```typescript
function unmappedTableRows(event: WikiEvent, manifest: NostrPostManifest): Array<[string, string]>;
```

### `buildWikiATag(pubkey, dTag)`

```typescript
function buildWikiATag(pubkey: string, dTag: string): string;
// => "30818:<pubkey>:<dTag>"
```

### `extractExternalIds(event)`

Returns all `i` tag values from a wiki event.

```typescript
function extractExternalIds(event: WikiEvent): string[];
```

### `normalizeDTag(input)`

Converts a human-readable title into a URL-safe d-tag slug.

```typescript
function normalizeDTag(input: string): string;
// "Pliny the Elder!" => "pliny-the-elder"
```

### `defaultResolver(events)`

Returns the newest non-deferred event. Falls back to all events if all are deferred.

```typescript
const defaultResolver: WikiResolverFunction;
// type WikiResolverFunction = (events: WikiEvent[]) => WikiEvent | null;
```

### `collectEntityATags(events)`

Builds `"30818:<pubkey>:<dTag>"` strings from a list of wiki events — for second-hop review queries.

```typescript
function collectEntityATags(events: WikiEvent[]): string[];
```

### Constants

```typescript
const WIKI_KIND = 30818;
const DEFAULT_WIKI_RELAYS: string[]; // wikifreedia.xyz, nos.lol, relay.damus.io
const STANDARD_WIKI_MANIFEST: NostrPostManifest; // article text only, for plain NIP-54 articles
```

---

## Architecture

### Storage strategy (single source of truth)

Each field maps to exactly **one** storage location — no dual-write:

| `mapTo.target` | Written to                              | Read from               |
| -------------- | --------------------------------------- | ----------------------- |
| `'tag'`        | Nostr event `tags` array                | `tags` array            |
| `'table'`      | Djot pipe table row in `content`        | Djot table in `content` |
| `'content'`    | Prose text after the table in `content` | Prose in `content`      |

The Djot table makes structured (`table`) fields readable in any wiki client that doesn't know about your manifest. Relay-filterable fields (`t`, `i`, `title`, `a`) use `'tag'` so they can be queried via relay filters. Apps that write via `manifestToWikiEvent` are losslessly round-trippable via `wikiEventToManifestData`.

### d-tag normalisation

`normalizeDTag` lowercases, converts spaces to hyphens, strips non-letter/digit characters (preserving Unicode letters), collapses consecutive hyphens, and trims.

### Resolver and `defer` / `fork`

Events with a `["a", "...", "", "defer"]` or `["e", "...", "", "defer"]` marker signal that the author defers to another version. `defaultResolver` excludes these unless all events are deferred (in which case it falls back to all of them, newest first).

---

## Resolver customisation

```typescript
import type { WikiResolverFunction } from "@nostr-post/wiki";

// Web-of-Trust example: prefer events from followed pubkeys
function makeWotResolver(followedPubkeys: Set<string>): WikiResolverFunction {
  return (events) => {
    const trusted = events.filter((e) => followedPubkeys.has(e.pubkey));
    const pool = trusted.length > 0 ? trusted : events;
    return pool.reduce(
      (newest, e) => (e.created_at > newest.created_at ? e : newest),
      pool[0],
    );
  };
}

// Wire it to the web component
const view = document.getElementById("wiki-view");
view.resolver = makeWotResolver(new Set(myFollows));
```
