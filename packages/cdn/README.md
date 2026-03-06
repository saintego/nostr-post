# @nostr-post/cdn

A single-file CDN bundle that includes **all** nostr-post web components and plugins — no npm install, no bundler required. Works like [nostr-login](https://github.com/nicknstr/nostr-login): add one `<script>` tag and start using components.

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

All six plugins and their UI elements are also registered:

- **Stars** — `@nostr-post/plugin-stars`
- **Geo** — `@nostr-post/plugin-geo`
- **Venue** — `@nostr-post/plugin-venue`
- **Media** — `@nostr-post/plugin-media`
- **Markdown** — `@nostr-post/plugin-markdown`
- **Hashtag** — `@nostr-post/plugin-hashtag`

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
  } from "https://saintego.github.io/nostr-post/nostr-post.js";

  const relays = await getUserRelays();
  console.log("User relays:", relays);
</script>
```

### IIFE

```html
<script src="https://saintego.github.io/nostr-post/nostr-post.iife.js"></script>
<script>
  const { pluginRegistry, signAndPublish, getUserRelays } = NostrPost;
</script>
```

### Available Exports

**Core**

- `validateManifest`, `getFieldsByKind`, `getUsedKinds`, `findFieldById`, `getRequiredFields`
- `coordinateEvents`, `validateFormData`

**Plugin Registry**

- `pluginRegistry`

**Signing & Relays**

- `signEvent`, `signAndPublish`, `publishToRelay`, `publishToRelays`
- `getPublicKey`, `hasNostrSigner`, `fetchEvents`, `fetchEventsFromRelay`
- `getUserRelays`, `getDefaultRelays`

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
