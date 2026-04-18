# nostr-post Development Guide

## Project Overview

**nostr-post** is a Plugin + Manifest Architecture for creating and viewing complex Nostr content. It uses layered architecture where different packages handle specific concerns.

**Tagline:** Manifest-Driven UI Engine for Structured Nostr Content  
**Status:** All core packages complete ✅

## Architecture Layers

```
                    Your App
            (React, Vue, Next.js, etc.)
                      │
     ┌────────────────▼─────────────────┐
     │ @nostr-post/react                │
     │ (Hooks + Components)             │
     │ + Plugin Packages                │
     └────────────────┬─────────────────┘
                      │
     ┌────────────────▼─────────────────┐
     │ @nostr-post/web                  │
     │ (Lit Web Components)             │
     │ <nostr-post-composer>            │
     │ <nostr-post-view>                │
     │ <nostr-post-feed>                │
     └────────────────┬─────────────────┘
                      │
     ┌────────────────▼──────────────────┐
     │ @nostr-post/signer               │
     │ (NIP-07 signing + relay)         │
     │ @nostr-post/plugins (registry)   │
     └────────────────┬──────────────────┘
                      │
     ┌────────────────▼──────────────────┐
     │ @nostr-post/core                 │
     │ (Zero Dependencies)              │
     │ Manifest validation              │
     │ Event coordination               │
     │ NIP-78 storage                   │
     └──────────────────────────────────┘
```

## Package Breakdown (All Complete ✅)

### Core Packages (5)

#### 1. **@nostr-post/core** ✅ (Headless)

**Location:** `packages/core/`  
**Status:** Complete - Production ready

**Purpose:** Pure TypeScript event coordination with zero dependencies

**Key Files:**
- `types.ts` - Type system (PostField, NostrTarget, FieldVisibility, etc.)
- `manifest.ts` - Manifest validation
- `coordinator.ts` - Event coordination and field defaults
- `nip78.ts` - NIP-78 manifest serialization

**Features:**
- ✅ Multi-event coordination (split across kinds)
- ✅ Manifest validation
- ✅ Form data validation with type checking
- ✅ defaultValue support (manifest-level defaults)
- ✅ Field visibility (hidden/visible/readonly in edit/view)
- ✅ extraTagsFn hook for plugin tag emission
- ✅ Geohash prefix tag expansion (NIP-52)
- ✅ Hashtag auto-extraction from Kind 1 content
- ✅ NIP-78 event serialization/deserialization

#### 2. **@nostr-post/signer** ✅

**Location:** `packages/signer/`  
**Status:** Complete

**Purpose:** NIP-07 browser extension signing and relay communication

**Features:**
- ✅ NIP-07 extension detection and fallback retry (up to 10x)
- ✅ Event signing
- ✅ Event publishing to relays
- ✅ Event fetching from relays with filters

#### 3. **@nostr-post/plugins** ✅ (Registry + Types)

**Location:** `packages/plugins/`  
**Status:** Complete

**Purpose:** Plugin interface and discovery registry

**Features:**
- ✅ Plugin interface with hooks (extraTags, resolveFromTags)
- ✅ Plugin registry singleton
- ✅ Plugin discovery by ID
- ✅ Auto-registration on import

#### 4. **@nostr-post/web** ✅ (Web Components)

**Location:** `packages/web/`  
**Status:** Complete - Production ready

**Purpose:** Lit-based Web Components that work in any HTML/JS context

**Components:**
- `<nostr-post-composer>` - Form builder with field defaults, excludeFields, readonlyFields, prefill
- `<nostr-post-view>` - Event viewer with NIP-78 auto-fetch
- `<nostr-post-feed>` - Event stream with refresh() method

**Features:**
- ✅ Automatic plugin loading on tag names
- ✅ Manifest-driven form generation
- ✅ Field visibility enforcement
- ✅ Readonly field rendering with view plugin
- ✅ Dark mode support
- ✅ Shadow DOM styling
- ✅ resolveFromTags hook support

#### 5. **@nostr-post/react** ✅ (React Bindings)

**Location:** `packages/react/`  
**Status:** Complete

**Purpose:** React hooks and wrapper components

**Hooks:**
- `useNostrAuth()` - Login/logout with NIP-07
- `useNostrPublish()` - Sign and publish with manifest coordination
- `useNostrEvents()` - Fetch events with filtering

**Components:**
- `<NostrPostComposer>` - Wrapper around web component
- `<NostrPostView>` - Display single event
- `<NostrPostFeed>` - Display event stream

**Features:**
- ✅ Props pass-through (excludeFields, readonlyFields, prefill, manifestRef)
- ✅ Events with proper event listener handling
- ✅ Feed refresh via useImperativeHandle()

### Plugins (6)

Each plugin package includes: core logic + web component input + web component view

#### 1. **plugin-stars** ✅

**Creates:** Rating selection (1-N stars)

**Core:** Converts number to "3/5" format  
**Input:** <np-stars-input> interactive stars  
**View:** <np-stars-view> static star display  
**Tags:** Single ["rating", "3/5"] per field

#### 2. **plugin-geo** ✅

**Creates:** Geohash location selection with map

**Core:** Geohash encode/decode (pure JS)  
**Input:** <np-geo-input> Leaflet map + geohash input  
**View:** <np-geo-view> location display + links  
**Tags:** ["g", "u09tvw"] + NIP-52 prefixes (["g", "u09tv"], etc.)

**Special:** Auto-generates geohash prefix tags for relay filtering

#### 3. **plugin-venue** ✅

**Creates:** Business/POI selection with OSM search

**Core:** Nominatim search + NIP-73 identity tag support  
**Input:** <np-venue-input> wraps geo, adds search overlay  
**View:** <np-venue-view> wraps geo view, adds venue UI  
**Tags:** ["g", geohash] + ["i", "osm:node:123"] (NIP-73) + ["location", address]

**Special Pattern:** Composition - venue wraps geo, doesn't duplicate map logic

#### 4. **plugin-media** ✅

**Creates:** Photo/video upload with array support

**Core:** Array field support, isImageUrl/isVideoUrl helpers  
**Input:** <np-media-input> drag-drop, multi-file, URL paste, NIP-98 signed upload  
**View:** <np-media-view> responsive gallery (images + lightbox, videos + controls)  
**Tags:** Multiple ["r", "https://..."] per field

**Special:** NIP-98 auth for nostr.build upload

#### 5. **plugin-markdown** ✅

**Creates:** Markdown editor with live preview

**Core:** Markdown validation (plain string passthrough)  
**Input:** <np-markdown-input> toolbar, split pane, WYSIWYG toggle  
**View:** <np-markdown-view> HTML rendering  
**Tags:** Single content field (usually Kind 30023 target: 'content')

#### 6. **plugin-hashtag** ✅

**Creates:** Tag arrays from simple text input

**Core:** Array support, normalizeTag, extractHashtags from content  
**Input:** <np-hashtag-input> chip editor, Enter/comma adds  
**View:** <np-hashtag-view> purple pill display  
**Tags:** Multiple ["t", "tag"] per field

**Special:** Auto-extracted from Kind 1 content in coordinator

### Examples & Tools (4)

#### 1. **examples/basic** ✅

Vanilla HTML with Web Components, no framework

#### 2. **examples/react-demo** ✅

React + Vite example with all plugins

#### 3. **examples/nextjs-demo** ✅

Next.js 13+ App Router with Server/Client components

#### 4. **tools/manifest-creator** ✅

Visual manifest editor app (Next.js) with 9 example manifests

## Technical Standards (CRITICAL)

### 1. File Size Limit: 500 Lines Max

- If a file exceeds 500 lines, refactor into smaller modules
- Use explicit subpath exports in package.json

### 2. No Barrel Files (index.ts)

```typescript
// ❌ DON'T: Barrel file that re-exports everything
export * from './types';
export * from './manifest';

// ✅ DO: Explicit subpath exports in package.json
{
  "exports": {
    "./types": "./dist/types.js",
    "./manifest": "./dist/manifest.js"
  }
}
```

### 3. Functional Programming Style

```typescript
// ✅ DO: Pure functions, immutable data
export const validateManifest = (
  manifest: NostrPostManifest,
): Result<void, ValidationError[]> => {
  // ...
};

// ❌ DON'T: Classes and mutable state
class ManifestValidator {
  private errors: ValidationError[] = [];
  validate(manifest: NostrPostManifest) {
    /* ... */
  }
}
```

### 4. Type Safety (Strict Mode)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### 5. Biome for Linting/Formatting

```bash
# Format all files
pnpm format

# Check for issues
pnpm lint

# Auto-fix
pnpm lint:fix
```

## Development Workflow

### 1. Creating a New Package

```bash
# Create package directory
mkdir -p packages/plugins

# Create package.json
cd packages/plugins
pnpm init

# Install dependencies
pnpm add -D typescript

# Add to root pnpm-workspace.yaml (already configured)
```

### 2. Package.json Template

```json
{
  "name": "@nostr-post/plugins",
  "version": "0.1.0",
  "description": "Framework-agnostic UI plugin system for nostr-post",
  "type": "module",
  "exports": {
    "./stars": {
      "types": "./dist/plugin-stars.d.ts",
      "import": "./dist/plugin-stars.js"
    },
    "./media": {
      "types": "./dist/plugin-media.d.ts",
      "import": "./dist/plugin-media.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": ["nostr", "plugins", "ui"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

### 3. Running Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode for development
pnpm dev

# Lint and format
pnpm lint:fix
pnpm format

# Type checking
pnpm typecheck
```

## Manifest Examples

### Example 1: Restaurant Review

```typescript
const restaurantReviewManifest: NostrPostManifest = {
  id: "restaurant-review-v1",
  version: "1.0.0",
  publishFormats: [
    { id: "default", label: "Default", kinds: [1, 30078], default: true },
  ],
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
    {
      id: "location",
      type: "geo",
      uiPlugin: "map",
      mapTo: { kind: 30078, target: "content", path: "venue.location" },
    },
  ],
};
```

### Example 2: Article with Media

```typescript
const articleManifest: NostrPostManifest = {
  id: "article-v1",
  version: "1.0.0",
  publishFormats: [
    { id: "default", label: "Default", kinds: [30023, 1], default: true },
  ],
  fields: [
    {
      id: "title",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30023, target: "tag", tagName: "title" },
      required: true,
    },
    {
      id: "content",
      type: "string",
      uiPlugin: "markdown",
      mapTo: { kind: 30023, target: "content" },
      required: true,
    },
    {
      id: "coverImage",
      type: "string",
      uiPlugin: "media",
      mapTo: { kind: 30023, target: "tag", tagName: "image" },
    },
    {
      id: "socialText",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 1, target: "content" },
    },
  ],
};
```

## Testing Strategy

### Unit Tests (Per Package)

- Test all validation functions
- Test manifest parsing
- Test event coordination logic
- Use Vitest or Bun test

### Integration Tests

- Test manifest → events → reconstruction flow
- Test plugin loading and rendering
- Test cross-package interactions

### E2E Tests

- Test Web Components in real browser
- Test React components in sample app

## Implementation Status

### Phase 1: Core Engine ✅ COMPLETE

- [x] Type definitions (PostField, NostrTarget, FieldVisibility)
- [x] Manifest validation with comprehensive error messages
- [x] EventCoordinator with multi-event splitting
- [x] defaultValue support at field level
- [x] Field visibility (hidden/visible/readonly)
- [x] Plugin hook support (extraTags, resolveFromTags)
- [x] Geohash prefix tag expansion (NIP-52)
- [x] Hashtag auto-extraction from content
- [x] Documentation and examples

### Phase 2: Plugin System ✅ COMPLETE

- [x] Plugin interface with hooks
- [x] Plugin registry singleton
- [x] 6 production plugins (stars, geo, venue, media, markdown, hashtag)
- [x] Plugin composition (venue wraps geo)
- [x] Plugin validation and loading

### Phase 3: Web Components ✅ COMPLETE

- [x] Lit component infrastructure
- [x] Composer component with field defaults, excludeFields, readonlyFields, prefill
- [x] View component with NIP-78 auto-fetch
- [x] Feed component with refresh()
- [x] Plugin auto-loading
- [x] Shadow DOM styling and dark mode
- [x] resolveFromTags hook support

### Phase 4: React Bindings ✅ COMPLETE

- [x] useNostrAuth() hook
- [x] useNostrPublish() hook with manifest coordination
- [x] useNostrEvents() hook for fetching
- [x] NostrPostComposer React wrapper
- [x] NostrPostView React wrapper
- [x] NostrPostFeed React wrapper

### Phase 5: Examples & Tools ✅ COMPLETE

- [x] Basic HTML example (Vanilla Web Components)
- [x] React + Vite example
- [x] Next.js 13+ App Router example
- [x] Manifest Creator visual editor (9 example manifests)

### Next Steps (Optional Enhancements)

- [ ] Comprehensive unit test suite
- [ ] Venue linking UI improvements (OSM ID deep links)
- [ ] Additional plugins (polls, calendars, markets)
- [ ] Performance optimizations
- [ ] API documentation website
- [ ] Advanced manifest features (conditions, dependencies)
- [ ] Plugin examples and documentation

### Phase 3: Web Components ✅ (COMPLETED)

- [x] Set up Lit-based Web Components infrastructure
- [x] Create composer component
- [x] Create view component
- [x] Create feed component
- [x] Integrate plugins with auto-loading
- [x] Styling system with dark mode support

### Phase 4: React Bindings ✅ (COMPLETED)

- [x] Create hooks (useNostrAuth, useNostrEvents, useNostrPublish)
- [x] Create React wrapper components
- [x] Example Next.js app
- [x] Example React (Vite) app

### Phase 5: Testing & Refinement (CURRENT)

- [ ] Unit tests for core package
- [ ] Integration tests
- [ ] E2E tests for components
- [ ] User testing and feedback
- [ ] API stabilization
- [ ] Performance optimization

## Key Design Decisions

1. **No Barrel Files:** Use explicit subpath exports for better tree-shaking
2. **Functional Core:** All logic is pure functions, no classes
3. **Framework Agnostic:** Core and plugins have zero framework dependencies
4. **Type-First:** TypeScript strict mode, exhaustive type checking
5. **Monorepo:** pnpm workspaces for package management
6. **Small Files:** Max 500 lines per file

## Resources

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-78: App-specific Data](https://github.com/nostr-protocol/nips/blob/master/78.md)
- [Biome Documentation](https://biomejs.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## Next Steps

1. **Add Testing Infrastructure (HIGH PRIORITY)**
   - Set up Vitest for unit testing
   - Write tests for validation functions in @nostr-post/core
   - Test EventCoordinator edge cases
   - Add integration tests for plugin rendering
   - E2E tests for web components

2. **User Testing & API Stabilization**
   - Get feedback from real-world usage
   - Identify pain points and confusing APIs
   - Stabilize manifest schema
   - Document breaking changes

3. **Plugin System Enhancement**
   - Test plugins in manifest-creator tool
   - Add more plugins (date, tags, mentions)
   - Improve plugin developer documentation
   - Add plugin validation examples

4. **Documentation Improvements**
   - API reference for each package
   - More usage examples
   - Video tutorials
   - Best practices guide

---

**Last Updated:** 2025-02-27  
**All Core Packages Status:** ✅ Implementation Complete  
**Current Priority:** Testing infrastructure and user feedback  
**Next Package:** None - Focus on stability and testing
