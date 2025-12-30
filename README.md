# nostr-post

> A Plugin + Manifest Architecture for Creating and Viewing Complex Nostr Content

## 🎯 What is nostr-post?

**nostr-post** is a UI engine that enables any website to create and view complex Nostr data (Reviews, Venues, Articles) using a shared "Plugin + Manifest" architecture.

Instead of building custom forms and parsers for every type of structured content, you define a **Manifest** that describes:

- What fields exist (rating, location, images, etc.)
- Where each field's data lives in the Nostr event ecosystem (Kind 1 tags, NIP-78 JSON paths)
- Which UI plugin renders each field (stars, map, markdown editor)

The engine automatically:

- ✅ Generates multi-event bundles with cross-linking
- ✅ Validates data against the manifest schema
- ✅ Splits complex data across appropriate Nostr event kinds

## 🧱 Architecture: The "Lego" System

```
┌─────────────────────────────────────────────┐
│  @nostr-post/react                          │  React/Next.js
│  (Hooks + Components)                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  @nostr-post/web                            │  Web Components
│  (<nostr-post-composer>, <nostr-post-view>) │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  @nostr-post/plugins                        │  Framework-agnostic
│  (Stars, Media, Markdown, Geo)              │  UI Plugins
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  @nostr-post/core  (HEADLESS)               │  Pure Logic
│  (Manifest parsing, validation, splitting)  │  Zero Dependencies
└─────────────────────────────────────────────┘
```

### Package Responsibilities

| Package                 | Status          | Purpose                                                 |
| ----------------------- | --------------- | ------------------------------------------------------- |
| **@nostr-post/core**    | ✅ **Complete** | Headless logic: manifest validation, event coordination |
| **@nostr-post/web**     | ✅ **Complete** | Universal Web Components + nostr-login integration      |
| **@nostr-post/react**   | ✅ **Complete** | React hooks and components                              |
| **@nostr-post/plugins** | 🚧 Next         | Framework-agnostic UI plugin definitions                |

## 🚀 Quick Start

### Installation

```bash
pnpm add @nostr-post/core
```

### Example: Restaurant Review

```typescript
import { coordinateEvents } from "@nostr-post/core/coordinator";
import type { NostrPostManifest } from "@nostr-post/core/types";

// 1. Define your manifest
const manifest: NostrPostManifest = {
  id: "restaurant-review-v1",
  version: "1.0.0",
  requiredKinds: [1, 30078], // Kind 1 (social) + Kind 30078 (structured)
  fields: [
    {
      id: "reviewText",
      type: "string",
      uiPlugin: "markdown",
      mapTo: { kind: 1, target: "content" },
      required: true,
    },
    {
      id: "rating",
      type: "number",
      uiPlugin: "stars",
      mapTo: { kind: 1, target: "tag", tagName: "r" },
      required: true,
    },
    {
      id: "venueName",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "venue.name" },
      required: true,
    },
  ],
};

// 2. Collect form data
const formData = {
  reviewText: "Amazing pizza! Best in town.",
  rating: 5,
  venueName: "Mario's Pizzeria",
};

// 3. Generate event bundle
const result = coordinateEvents(manifest, formData);

if (result.success) {
  const { events } = result.data;
  // events[0]: Kind 1 with review text + rating tag
  // events[1]: Kind 30078 with structured venue data

  // Sign and publish to Nostr relays...
}
```

## 📦 Packages

### [@nostr-post/core](./packages/core) ✅

**Status:** Initial implementation complete

Pure TypeScript logic with zero dependencies. Handles:

- Manifest validation
- Form data validation
- Multi-event coordination
- Support for NIP-01, NIP-78, and more

```typescript
import { coordinateEvents } from "@nostr-post/core/coordinator";
import { validateManifest, getFieldsByKind } from "@nostr-post/core/manifest";
import type { NostrPostManifest, PostField } from "@nostr-post/core/types";
```

### @nostr-post/plugins 🚧

**Status:** Next priority

Framework-agnostic plugin definitions. No React, no DOM, just pure interfaces.

```typescript
// Future usage
import { starsPlugin, mediaPlugin, markdownPlugin } from "@nostr-post/plugins";
```

### @nostr-post/web 📋

**Status:** Planned

Universal Web Components that work everywhere.

```html
<!-- Future usage -->
<nostr-post-composer manifest-id="restaurant-review-v1"></nostr-post-composer>
<nostr-post-view event-id="abc123..."></nostr-post-view>
```

### @nostr-post/react 📋

**Status:** Planned

React hooks and components for Next.js/React apps.

```tsx
// Future usage
function ReviewForm() {
  const { coordinateEvents } = useEventCoordinator(manifest);
  // ...
}
```

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

- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Comprehensive guide for contributors
- **[Examples](./EXAMPLES.md)** - Real-world usage examples
- **[Technical Standards](./DEVELOPMENT_GUIDE.md#technical-standards-critical)** - Coding standards and best practices

## 🎯 Roadmap

### Phase 1: Core Engine ✅ (Complete)

- [x] Type definitions
- [x] Manifest validation
- [x] EventCoordinator
- [ ] Unit tests
- [ ] API documentation

### Phase 2: Plugin System 🚧 (Next)

- [ ] Plugin interface definition
- [ ] Plugin registry
- [ ] Core plugins (stars, media, markdown)
- [ ] Plugin validation

### Phase 3: Web Components 📋

- [ ] Set up Web Components infrastructure
- [ ] Composer component
- [ ] View component
- [ ] Plugin integration

### Phase 4: React Bindings 📋

- [ ] React hooks
- [ ] React components
- [ ] Example Next.js app

## 🤝 Contributing

We follow strict coding standards:

1. **Max 500 lines per file** - Refactor if exceeded
2. **No barrel files** - Use explicit subpath exports
3. **Functional style** - Pure functions, immutable data
4. **TypeScript strict mode** - Full type safety
5. **Biome for linting** - Fast, Rust-based tooling

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for complete standards.

## 📄 License

MIT

## 🔗 Resources

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-78: App-specific Data](https://github.com/nostr-protocol/nips/blob/master/78.md)
- [NIP-23: Long-form Content](https://github.com/nostr-protocol/nips/blob/master/23.md)

---

**Built with ❤️ for the Nostr ecosystem**

Enable any website to create and view complex Nostr data (Reviews, Venues, Articles) using a shared "Plugin + Manifest" architecture. Inspired by the nostr-login approach, this project provides ready-to-use UI components with a headless core.

## The "Lego" Architecture

This monorepo contains four main packages:

- **@nostr-post/core**: Headless logic layer. Handles manifest parsing, validation, and multi-event "splitting" (e.g., Kind 1 for social, NIP-78 for rich data). Framework-agnostic and UI-independent.
- **@nostr-post/plugins**: Atomic, framework-agnostic UI modules (e.g., plugin-stars, plugin-media).
- **@nostr-post/web**: Browser-ready Web Components (`<nostr-post-composer>`, `<nostr-post-view>`) with built-in UI, similar to nostr-login's approach.
- **@nostr-post/react**: High-level hooks and components for React/Next.js with pre-styled UI.

## Technical Standards

- **Language**: TypeScript (Strict mode)
- **Toolchain**: Biome for linting and formatting
- **Package Manager**: pnpm with Workspaces
- **Coding Style**: Functional programming, pure functions, immutable data
- **File Constraints**: Max 500 lines per file
- **Exports**: Explicit subpath exports, no barrel files

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Lint and format
pnpm lint
pnpm format
```

## Development Roadmap

### Phase 1: Core Engine ✓ (In Progress)

Build the EventCoordinator that takes a Manifest and Form Data, then produces a Bundle of unsigned events with cross-linking tags.

### Phase 2: Plugin System

Define the NostrUIPlugin interface so that Media, Stars, and Markup plugins can be injected into the UI at runtime.

### Phase 3: Web Components

Create the universal wrappers that use the Core logic to render forms and views in plain HTML.

## License

MIT
