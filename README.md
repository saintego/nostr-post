🚧 **ALPHA - API WILL CHANGE** 🚧

This project is in active development. Expect breaking changes to the API, manifest format, and plugin system before v1.0.

---

# nostr-post

> An easy-to-use library for showing and creating Nostr posts on any web page, with a deeper plugin + manifest system for complex structured content.

Use it in plain HTML through the CDN bundle, drop in Web Components, use the React wrappers, or run it headless. Start with simple post creation and viewing, then scale up to manifest-driven structured content like reviews, articles, events, venues, and multi-event workflows.

## 🎯 What is nostr-post?

**nostr-post** enables you to:

✅ **Use it fast** - Add Nostr post creation, viewing, and feeds to almost any site with Web Components or the CDN bundle  
✅ **Stay simple when you want** - Works for basic kind 1 posts without needing manifests or custom plugins  
✅ **Define content once** via JSON manifest (what fields, which plugin, where data lives)  
✅ **Works everywhere** - Web Components, React, Next.js, or headless  
✅ **Automatic coordination** - Forms split into multi-event bundles with NIP-78 linking  
✅ **Composable plugins** - Media arrays, geohash locations, markdown editors, hashtags, ratings  
✅ **Field-level control** - Visibility, read-only modes, default values, prefill, exclude fields  
✅ **NIP support** - NIP-01, NIP-07 (signing), NIP-23 (articles), NIP-52 (geohash filtering), NIP-73 (identity tags), NIP-78 (manifest storage), NIP-98 (file upload auth)

## 🧱 Architecture: The "Lego" System

## 🧱 Architecture: Package Layers

```
┌────────────────────────────────────┐
│  Your App (React, Vue, Next.js)    │
└────────────────┬───────────────────┘
                 │
    ┌────────────▼──────────────┐
    │ @nostr-post/react         │  (Hooks + React Components)
    │ + Plugin Packages          │  (plugin-geo, plugin-media, etc.)
    └────────────┬──────────────┘
                 │
    ┌────────────▼──────────────────┐
    │ @nostr-post/web               │  (Lit Web Components)
    │ <nostr-post-composer>         │
    │ <nostr-post-view>             │
    │ <nostr-post-feed>             │
    └────────────┬──────────────────┘
                 │
    ┌────────────▼──────────────────┐
    │ @nostr-post/signer            │  (NIP-07, Relay Publish/Fetch)
    │ @nostr-post/plugins (Registry)│
    └────────────┬──────────────────┘
                 │
    ┌────────────▼──────────────────┐
    │ @nostr-post/core              │  (Zero Dependencies)
    │ Manifest validation           │  Pure TypeScript Logic
    │ Event coordination            │
    │ NIP-78 storage               │
    └───────────────────────────────┘
```

### Packages & Plugins Status

| Package                 | Status          | Purpose                                                 |
| ----------------------- | --------------- | ------------------------------------------------------- |
| **@nostr-post/core**    | ✅ **Complete** | Manifest validation, event coordination, NIP-78 storage |
| **@nostr-post/signer**  | ✅ **Complete** | NIP-07 signing, relay publish/fetch                     |
| **@nostr-post/plugins** | ✅ **Complete** | Plugin registry + types (extraTags, resolveFromTags)    |
| **@nostr-post/web**     | ✅ **Complete** | Lit web components (composer, view, feed)               |
| **@nostr-post/react**   | ✅ **Complete** | React hooks + wrapper components                        |
| **@nostr-post/cdn**     | ✅ **Complete** | Single-file CDN bundle (ESM + IIFE, no npm required)    |
| **plugin-stars**        | ✅ **Complete** | Star rating (1-5 scale, customizable)                   |
| **plugin-geo**          | ✅ **Complete** | Geohash location picker with NIP-52 prefix tags         |
| **plugin-venue**        | ✅ **Complete** | OSM venue search + NIP-73 identity tags, wraps geo      |
| **plugin-media**        | ✅ **Complete** | Multi-file upload with NIP-98 auth to nostr.build       |
| **plugin-markdown**     | ✅ **Complete** | Markdown editor with live preview                       |
| **plugin-hashtag**      | ✅ **Complete** | Hashtag array input with auto-extraction from content   |

## � Key Features

### 1. **Manifest-Driven Architecture**

Define content structure once, deploy everywhere:

```typescript
const manifest: NostrPostManifest = {
  id: "blog-v1",
  version: "1.0.0",
  requiredKinds: [30023], // Long-form articles
  fields: [
    {
      id: "title",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 30023, target: "title" },
      defaultValue: "Untitled Article",
    },
    {
      id: "content",
      type: "string",
      uiPlugin: "markdown",
      mapTo: { kind: 30023, target: "content" },
      required: true,
    },
  ],
};
```

### 2. **Multi-Event Coordination**

Automatically splits data across event kinds and links them via NIP-78:

```typescript
const result = coordinateEvents(manifest, formData, { pubkey });
// returns: { events: [Kind 30023, Kind 30078 (manifest)] }
```

### 3. **6 Production Plugins**

Ready-to-use UI components via Web Components or React:

- **plugin-geo** - Location picker (Leaflet map + geohash, NIP-52)
- **plugin-venue** - Business/POI search (Nominatim OSM, NIP-73)
- **plugin-media** - Photo/video upload (drag-drop, multi-file, NIP-98)
- **plugin-markdown** - Rich text editor with live preview
- **plugin-hashtag** - Tag arrays with auto-extraction from content
- **plugin-stars** - Customizable rating (1-5 scale)

### 4. **Field-Level Controls**

Visibility, defaults, prefill, readonly, exclusion:

```typescript
{
  id: "private-notes",
  type: "string",
  visibility: {
    edit: "visible",    // Author can edit
    view: "hidden"      // Viewers cannot see
  },
  defaultValue: "My notes...",
}
```

### 5. **Plugin Composition**

Plugins emit custom tags and reconstruct from tags:

```typescript
// plugin-venue wraps plugin-geo, adds OSM search
// Emits: ["g", geohash], ["i", "osm:node:123"], ["location", address]
// Reconstructs from all 3 tags back into VenueData object
```

### 6. **NIP Support**

Built on standardized Nostr Improvement Proposals:

| NIP        | Feature                   | Example                       |
| ---------- | ------------------------- | ----------------------------- |
| **NIP-01** | Base protocol             | All events build on this      |
| **NIP-07** | Browser extension signing | `window.nostr.signEvent()`    |
| **NIP-23** | Kind 30023 (articles)     | Long-form content             |
| **NIP-52** | Geohash prefix tags       | Relay-side location filtering |
| **NIP-73** | External identity tags    | OSM place IDs                 |
| **NIP-78** | Manifest storage          | Kind 30078 structured data    |
| **NIP-98** | HTTP file server auth     | nostr.build upload            |

## 🏃 Quick Start

### CDN (No Build Tools Required)

The fastest way to get started — add one script tag:

```html
<!DOCTYPE html>
<html>
  <head>
    <script
      type="module"
      src="https://saintego.github.io/nostr-post/nostr-post.js"
    ></script>
  </head>
  <body>
    <h1>Create a Post</h1>
    <nostr-post-composer auto-publish></nostr-post-composer>
  </body>
</html>
```

Or use the IIFE build for older browsers:

```html
<script src="https://saintego.github.io/nostr-post/nostr-post.iife.js"></script>
```

**📦 What's included:** All web components (`<nostr-post-composer>`, `<nostr-post-view>`, `<nostr-post-feed>`) + all 6 plugins are automatically registered. [Full CDN docs →](./packages/cdn/README.md)

---

### Web Components (With npm)

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import "@nostr-post/web";
    </script>
  </head>
  <body>
    <nostr-post-composer></nostr-post-composer>
  </body>
</html>
```

### React

```tsx
import { NostrPostComposer, useNostrAuth } from "@nostr-post/react";

export default function App() {
  const { pubkey, login } = useNostrAuth();

  return !pubkey ? (
    <button onClick={login}>Login with Nostr</button>
  ) : (
    <NostrPostComposer pubkey={pubkey} />
  );
}
```

Detailed setup: [QUICKSTART.md](./QUICKSTART.md)

```typescript
import { coordinateEvents } from "@nostr-post/core/coordinator";
import { validateManifest, getFieldsByKind } from "@nostr-post/core/manifest";
import type { NostrPostManifest, PostField } from "@nostr-post/core/types";
```

### [@nostr-post/signer](./packages/signer) ✅

**Status:** Complete

NIP-07 browser extension integration and relay communication.

```typescript
import { NostrSigner } from "@nostr-post/signer";

const signer = new NostrSigner();
await signer.signEvent(event);
```

### [@nostr-post/plugins](./packages/plugins) ✅

**Status:** Complete

Framework-agnostic plugin definitions and registry. Includes plugins for:

- Stars (ratings)
- Media (images/videos)
- Markdown
- Geo (location)
- Hashtags
- Venues

```typescript
import { getPlugin } from "@nostr-post/plugins/registry";

const starsPlugin = getPlugin("stars");
```

### [@nostr-post/web](./packages/web) ✅

**Status:** Complete

Universal Web Components that work in any framework or vanilla HTML.

```html
<nostr-post-composer></nostr-post-composer>
<nostr-post-view></nostr-post-view>
<nostr-post-feed></nostr-post-feed>
```

Built-in plugin loading:

- `@nostr-post/web` lazy-loads built-in plugin UI modules when a manifest uses them.
- This keeps SSR safe while still making built-in manifest plugins work automatically.
- Built-in plugin ids supported automatically: `media`, `hashtag`, `stars`, `geo`, `venue`, `markdown`, `list`.
- You only need manual plugin imports for custom or external plugin packages.

Default behavior when no `manifest` is provided:
- `nostr-post-composer` uses `STANDARD_KIND1_POST_MANIFEST`
- `nostr-post-view` uses `STANDARD_KIND1_POST_MANIFEST`

This means text, media (`r` tags), and hashtags (`t` tags) render out of the box for standard kind 1 posts.

`<nostr-post-composer>` extended reply context API:
- `reply-to-event-id`, `reply-to-pubkey`, `root-event-id`, `root-pubkey`
- `show-reply-target` to show current reply target
- `editable-reply-target` to allow editing reply target directly in the composer

`<nostr-post-view>` metadata visibility defaults:
- Technical metadata is hidden by default (`show-kind=false`, `show-tags=false`)
- Enable manifest/debug mode with `show-kind` and/or `show-tags`
- Author name/avatar still render by default when profile metadata is available

`<nostr-post-feed>` interaction API:
- `comments-enabled` (default `true`)
- `reactions-enabled` (default `true`)
- `commentManifest` (defaults to standard kind 1 manifest)
- `reactionOptions` (defaults to `['+', '❤️', '🔥', '😂']`)

`<nostr-post-feed>` supports direct Nostr filtering (`authors`, `kinds`, `ids`, `since`, `until`, `limit`, `search`) plus universal tag filters via `tagFilters` / `filter-tags` (for example `#g` geohash and `#i` OSM identity tags). It also supports advanced multi-filter `REQ` queries through the `filters` property.

Detailed examples: [packages/cdn/README.md](./packages/cdn/README.md)

### [@nostr-post/react](./packages/react) ✅

**Status:** Complete

React hooks and components for Next.js/React apps.

```tsx
import {
  NostrPostComposer,
  NostrPostFeed,
  useNostrAuth,
} from "@nostr-post/react";

function App() {
  const { pubkey, login } = useNostrAuth();
  return <NostrPostComposer pubkey={pubkey} />;
}
```

`@nostr-post/react` wrappers expose the same interaction capabilities as web components:
- `NostrPostFeed`: `commentsEnabled`, `reactionsEnabled`, `commentManifest`, `reactionOptions`
- `NostrPostView`: `showKind`, `showTags` (technical metadata off by default in view)
- `NostrPostComposer`: reply-target properties via web-component attributes/properties

`useNostrPublish()` defaults to `STANDARD_KIND1_POST_MANIFEST` when `manifest` is omitted.

`NostrPostFeed` supports the same advanced filtering options as the web component:

```tsx
import { NostrPostFeed } from "@nostr-post/react";

export function VenueFeed({ placeId }: { placeId: string }) {
  return (
    <NostrPostFeed
      kinds={[1]}
      limit={20}
      filterTags={`#i:osm:node:${placeId},#g:u09tvw`}
    />
  );
}
```

You can also use object/advanced forms:

```tsx
<NostrPostFeed
  tagFilters={{ "#i": [`osm:node:${placeId}`], "#g": ["u09tvw"] }}
  since={Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7}
  search="review"
/>

<NostrPostFeed
  filters={[
    { kinds: [1], "#g": ["u09tvw"], limit: 20 },
    { kinds: [30023], "#t": ["review"], limit: 20 },
  ]}
/>
```

### [@nostr-post/cdn](./packages/cdn) ✅

**Status:** Complete

Single-file CDN bundle with all components and plugins — no npm required.

**Deployed at:** https://saintego.github.io/nostr-post/

```html
<!-- ESM (recommended) -->
<script
  type="module"
  src="https://saintego.github.io/nostr-post/nostr-post.js"
></script>

<!-- IIFE (classic) -->
<script src="https://saintego.github.io/nostr-post/nostr-post.iife.js"></script>

<!-- Use components -->
<nostr-post-composer auto-publish></nostr-post-composer>
```

**Bundle size:** ~267 KB raw / ~72 KB gzipped

## 🎨 Key Features

### 1. Manifest-Driven

Define your content structure once, use it everywhere.

### 2. Multi-Event Splitting

Automatically split complex data across multiple Nostr event kinds:

- Kind 1 for social/shareable content
- Kind 30078 for rich structured data
- Kind 30023 for long-form articles

### 3. Type-Safe

Full TypeScript support with strict mode enabled.

### 4. Functional & Pure

No classes, no mutations, just pure functions and immutable data.

### 5. Framework-Agnostic

Core logic works in any JavaScript environment. UI layers available for Web Components and React.

## 🛠️ Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/nostr-post.git
cd nostr-post

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Lint and format
pnpm lint:fix
pnpm format
```

### Project Structure

```
nostr-post/
├── packages/
│   └── core/              ✅ Headless logic
│       ├── src/
│       │   ├── types.ts        # Core type definitions
│       │   ├── manifest.ts     # Manifest validation
│       │   └── coordinator.ts  # Event coordination
│       └── package.json
├── DEVELOPMENT_GUIDE.md   # Comprehensive dev guide
├── EXAMPLES.md            # Usage examples
└── package.json           # Monorepo root
```

## 📚 Documentation

- **[Quick Start Guide](./QUICKSTART.md)** - Get started from installation to working examples
- **[Usage Guide](./USAGE_GUIDE.md)** - Complete API reference for all packages
- **[Examples](./EXAMPLES.md)** - Real-world usage examples and code samples
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Comprehensive guide for contributors
- **[Architecture](./ARCHITECTURE.md)** - System design and technical architecture
- **[Plugins](./PLUGINS.md)** - Creating and using custom plugins

## 🎯 Roadmap

### Phase 1: Core Engine ✅ (Complete)

- [x] Type definitions

### Phase 2: Domain Scenarios (Planned)

- [x] Comments support (kind 1) with manifest presets, examples, and protocol-standard reply tags
- [ ] Calendar events support (NIP-52) with agenda-oriented rendering
- [ ] P2P offers support (NIP-69) with filtered feed presets/views
- [ ] Zap support (NIP-57): zap requests/receipts with amount + payer views and filtering
- [ ] Add scenario manifests for:
  - offer creation (NIP-69)
  - offer confirmation messages (NIP-17 formatted payload)
  - deal closing flow events

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Build all 15 packages (11 libraries + 3 examples + manifest creator)
pnpm -r build

# Watch mode for development
pnpm -r dev

# Type checking
pnpm typecheck

# Linting + formatting with Biome
pnpm lint
pnpm format
```

## 📚 Documentation

| Guide                                              | Purpose                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| **[QUICKSTART.md](./QUICKSTART.md)**               | Setup for Web Components, React, Next.js                             |
| **[USAGE_GUIDE.md](./USAGE_GUIDE.md)**             | Complete API reference for all packages                              |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)**           | Design decisions, NIP support, patterns                              |
| **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** | Contributing, technical standards                                    |
| **[EXAMPLES.md](./EXAMPLES.md)**                   | Real-world code examples                                             |
| **[PLUGINS.md](./PLUGINS.md)**                     | Creating custom UI plugins                                           |
| **[INTEGRATION.md](./INTEGRATION.md)**             | Using in other projects, Vercel deployment, venue review app example |
| **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)**     | Technical implementation summary                                     |

## 🤝 Contributing

We follow strict coding standards:

1. **Max 500 lines per file** - Refactor if exceeded
2. **No barrel files** - Use explicit subpath exports in package.json
3. **Functional style** - Pure functions, immutable data
4. **TypeScript strict mode** - Full type safety
5. **Biome for linting** - Unified formatting and linting

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for complete standards.

## 📄 License

MIT

## 🔗 Resources

- [Nostr Protocol](https://nostr.com/)
- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-07: Nostr Sign-in Flow](https://github.com/nostr-protocol/nips/blob/master/07.md)
- [NIP-23: Long-form Content](https://github.com/nostr-protocol/nips/blob/master/23.md)
- [NIP-52: Calendar Events](https://github.com/nostr-protocol/nips/blob/master/52.md)
- [NIP-73: External Content ID](https://github.com/nostr-protocol/nips/blob/master/73.md)
- [NIP-78: App-specific Data](https://github.com/nostr-protocol/nips/blob/master/78.md)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md)

---

**Built with ❤️ for the Nostr ecosystem**
