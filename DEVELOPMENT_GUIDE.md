# nostr-post Development Guide

## Project Overview

**nostr-post** is a Plugin + Manifest Architecture for creating and viewing complex Nostr content. It uses a "Lego" architecture where different packages handle specific concerns.

**Tagline:** A Headless UI Engine for Structured Nostr Content

## Architecture

### The "Lego" System

```
@nostr-post/core (Headless)
    ↓
@nostr-post/plugins (Framework-agnostic UI)
    ↓
@nostr-post/web (Web Components)
    ↓
@nostr-post/react (React/Next.js)
```

### Package Responsibilities

#### 1. **@nostr-post/core** (Headless Logic - COMPLETED ✓)
- **Status:** Initial implementation complete
- **Location:** `packages/core/`
- **Purpose:** Pure TypeScript logic with zero UI dependencies
- **Key Files:**
  - `types.ts` - Core type definitions
  - `manifest.ts` - Manifest validation and utilities
  - `coordinator.ts` - EventCoordinator for multi-event splitting

**What's Implemented:**
- ✅ Manifest type system with field-to-Nostr mapping
- ✅ Validation functions for manifests and form data
- ✅ EventCoordinator that produces unsigned event bundles
- ✅ Support for NIP-01 (basic events) and NIP-78 (structured data)

**Next Steps for Core:**
- [ ] Add unit tests for all validation functions
- [ ] Implement event ID generation (NIP-01)
- [ ] Add cross-linking logic ('e' tags for related events)
- [ ] Support for more field types (arrays, nested objects)

#### 2. **@nostr-post/plugins** (Next Priority)
- **Status:** Not yet created
- **Purpose:** Atomic, framework-agnostic UI plugin system
- **Key Concepts:**
  - Each plugin is a pure function/configuration object
  - No framework dependencies (no React, no DOM)
  - Just interfaces and specifications

**Recommended Structure:**
```
packages/plugins/
├── package.json
├── src/
│   ├── plugin-interface.ts    # NostrUIPlugin interface
│   ├── plugin-stars.ts        # Rating/stars plugin
│   ├── plugin-media.ts        # Image/video upload plugin
│   ├── plugin-markdown.ts     # Rich text editor plugin
│   ├── plugin-geo.ts          # Location picker plugin
│   └── registry.ts            # Plugin registry/loader
```

**Plugin Interface (from types.ts):**
```typescript
export interface NostrUIPlugin {
  id: string;
  type: FieldType | FieldType[];
  validate?: (value: unknown, field: PostField) => Result<void, ValidationError>;
}
```

**To Implement:**
- [ ] Expand NostrUIPlugin interface with render metadata
- [ ] Create plugin registry/discovery system
- [ ] Implement core plugins (stars, media, markdown)
- [ ] Add plugin configuration schema

#### 3. **@nostr-post/web** (Web Components Layer)
- **Status:** Not yet created
- **Purpose:** Universal, framework-independent UI using Web Components
- **Key Components:**
  - `<nostr-post-composer>` - Form builder using manifest
  - `<nostr-post-view>` - Read-only view of Nostr events
  - `<nostr-post-field>` - Individual field renderer

**Recommended Structure:**
```
packages/web/
├── package.json
├── src/
│   ├── components/
│   │   ├── nostr-post-composer.ts
│   │   ├── nostr-post-view.ts
│   │   └── nostr-post-field.ts
│   ├── plugin-renderers/
│   │   ├── stars-renderer.ts
│   │   └── media-renderer.ts
│   └── index.ts
```

**To Implement:**
- [ ] Set up Lit or vanilla Web Components
- [ ] Create base component classes
- [ ] Integrate @nostr-post/core for logic
- [ ] Load plugins dynamically
- [ ] Add styling system (CSS variables, shadow DOM)

#### 4. **@nostr-post/react** (React Bindings)
- **Status:** Not yet created
- **Purpose:** React hooks and components for Next.js/React apps
- **Key Exports:**
  - `useManifest(manifestId)` - Load and validate manifest
  - `useEventCoordinator()` - Hook for event coordination
  - `<NostrPostComposer>` - React component wrapper
  - `<NostrPostView>` - React view component

**Recommended Structure:**
```
packages/react/
├── package.json
├── src/
│   ├── hooks/
│   │   ├── useManifest.ts
│   │   ├── useEventCoordinator.ts
│   │   └── useNostrPlugin.ts
│   ├── components/
│   │   ├── NostrPostComposer.tsx
│   │   └── NostrPostView.tsx
│   └── index.ts
```

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
export const validateManifest = (manifest: NostrPostManifest): Result<void, ValidationError[]> => {
  // ...
};

// ❌ DON'T: Classes and mutable state
class ManifestValidator {
  private errors: ValidationError[] = [];
  validate(manifest: NostrPostManifest) { /* ... */ }
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
  id: 'restaurant-review-v1',
  version: '1.0.0',
  requiredKinds: [1, 30078],
  fields: [
    {
      id: 'reviewText',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: { kind: 1, target: 'content' },
      required: true,
    },
    {
      id: 'rating',
      type: 'number',
      uiPlugin: 'stars',
      mapTo: { kind: 1, target: 'tag', tagName: 'r' },
      required: true,
    },
    {
      id: 'venueName',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30078, target: 'content', path: 'venue.name' },
      required: true,
    },
    {
      id: 'location',
      type: 'geo',
      uiPlugin: 'map',
      mapTo: { kind: 30078, target: 'content', path: 'venue.location' },
    },
  ],
};
```

### Example 2: Article with Media

```typescript
const articleManifest: NostrPostManifest = {
  id: 'article-v1',
  version: '1.0.0',
  requiredKinds: [30023, 1],
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30023, target: 'tag', tagName: 'title' },
      required: true,
    },
    {
      id: 'content',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: { kind: 30023, target: 'content' },
      required: true,
    },
    {
      id: 'coverImage',
      type: 'string',
      uiPlugin: 'media',
      mapTo: { kind: 30023, target: 'tag', tagName: 'image' },
    },
    {
      id: 'socialText',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 1, target: 'content' },
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

## Phase Implementation Order

### Phase 1: Core Engine ✓ (COMPLETED)
- [x] Type definitions
- [x] Manifest validation
- [x] EventCoordinator
- [ ] Unit tests
- [ ] Documentation

### Phase 2: Plugin System (NEXT)
- [ ] Define plugin interface
- [ ] Create plugin registry
- [ ] Implement core plugins (stars, media, markdown)
- [ ] Plugin validation and loading

### Phase 3: Web Components
- [ ] Set up Web Components infrastructure
- [ ] Create composer component
- [ ] Create view component
- [ ] Integrate plugins
- [ ] Styling system

### Phase 4: React Bindings
- [ ] Create hooks
- [ ] Create React components
- [ ] Example Next.js app

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

1. **Add Tests to @nostr-post/core**
   - Set up Vitest
   - Write tests for validation functions
   - Test EventCoordinator

2. **Create @nostr-post/plugins**
   - Define expanded plugin interface
   - Implement plugin registry
   - Create first 3 plugins (stars, media, markdown)

3. **Create Sample Manifests**
   - Add manifest examples directory
   - Document common patterns

4. **Documentation**
   - API reference for each package
   - Usage examples
   - Migration guides

---

**Last Updated:** 2025-12-29
**Core Package Status:** ✅ Initial Implementation Complete
**Next Priority:** Plugin System (@nostr-post/plugins)
