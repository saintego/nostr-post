# @nostr-post/wiki

NIP-54 collaborative wiki entities (`kind:30818`) for the `nostr-post` ecosystem.

---

## Table of contents

- [What are wiki entities?](#what-are-wiki-entities)
- [Quick start (CDN)](#quick-start-cdn)
- [Installation](#installation)
- [Entity manifest](#entity-manifest)
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
        mapTo: { kind: 30818, target: "tag", tagName: "abv" },
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

Define the shape of your entity. All `mapTo` targets with `kind: 30818` are stored as tags (relay-indexed) **and** duplicated into a Djot table in the `content` field for readability in other wiki clients.

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
      mapTo: { kind: 30818, target: "tag", tagName: "abv" },
      metadata: { label: "ABV (%)" },
    },
    {
      id: "ibu",
      type: "number",
      uiPlugin: "number",
      mapTo: { kind: 30818, target: "tag", tagName: "ibu" },
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

### Generated Nostr event

```json
{
  "kind": 30818,
  "tags": [
    ["d", "pliny-the-elder"],
    ["title", "Pliny the Elder"],
    ["t", "Double IPA"],
    ["abv", "8.0"],
    ["ibu", "100"],
    ["i", "untappd:beer:4892"]
  ],
  "content": "| Field | Value |\n|-------|-------|\n| title | Pliny the Elder |\n| style | Double IPA |\n| abv | 8.0 |\n| ibu | 100 |\n\nA legendary West Coast Double IPA brewed by Russian River Brewing Company."
}
```

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
      metadata: { label: "Beer" },
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

Displays a resolved wiki entity as a read-only infobox.

| Attribute / Property        | Type                   | Description                                               |
| --------------------------- | ---------------------- | --------------------------------------------------------- |
| `entity-id` / `entityId`    | `string`               | Entity d-tag (slug) to load                               |
| `entity-i-id` / `entityIId` | `string`               | External ID to look up (`i` tag) — triggers two-hop query |
| `manifest`                  | `NostrPostManifest`    | Field definitions (property only)                         |
| `relays`                    | `string[]`             | Override relay list (property only)                       |
| `resolver`                  | `WikiResolverFunction` | Custom resolver (property only)                           |

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
| `entity-id` / `entityId`       | `string`            | Existing entity to pre-fill and fork      |
| `manifest`                     | `NostrPostManifest` | Field definitions (property only)         |
| `relays`                       | `string[]`          | Override relay list (property only)       |
| `auto-publish` / `autoPublish` | `boolean`           | Publish automatically using NIP-07 signer |

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
  dTag?: string; // override the d-tag slug (default: normalise from title field)
  relays?: string[];
}
```

### `wikiEventToManifestData(event, manifest)`

Parses a `kind:30818` event back into a plain object keyed by field IDs. Tags are read first (canonical); the Djot table in `content` is used as fallback. Also returns `__dTag` for building `a` tags.

```typescript
function wikiEventToManifestData(
  event: WikiEvent,
  manifest: NostrPostManifest,
): Record<string, unknown>;
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
const DEFAULT_WIKI_RELAYS: string[]; // wikifreedia.xyz, nos.lol, relay.nostr.band, relay.damus.io
```

---

## Architecture

### Dual-write strategy

Every tag field is written **twice**:

1. As a Nostr tag — relay-indexed and machine-readable.
2. As a row in a Djot pipe table at the start of the `content` field — human-readable in any wiki client that doesn't know about your manifest.

Prose fields are appended after the table.

**Read order:** tags first (canonical), Djot table as fallback. This means:

- Apps that write via `manifestToWikiEvent` are losslessly round-trippable via `wikiEventToManifestData`.
- Hand-written wiki articles without nostr-post tags can still be parsed (table fallback).

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
