# Architecture & Design Decisions

## Why These Choices?

### 1. Core: Zero Dependencies

**@nostr-post/core** has ZERO dependencies by design:

- **Pure TypeScript logic** - manifest parsing, validation, event coordination
- **Creates unsigned events** - doesn't sign or publish
- **Environment agnostic** - works in browsers, Node.js, Deno, React Native, CloudFlare Workers
- **Your choice of Nostr library** - use NDK, nostr-tools, or any signing method

```typescript
// Core just creates unsigned events
const result = coordinateEvents(manifest, formData, { pubkey: "..." });

// YOU choose how to sign
const signed = await window.nostr.signEvent(result.data.events[0]);
// OR
const signed = await ndk.signEvent(result.data.events[0]);
// OR
const signed = await nostrTools.finalizeEvent(
  result.data.events[0],
  privateKey
);
```

### 2. Web Components: Lit vs Stencil

**Why Lit?**

| Lit                        | Stencil                 |
| -------------------------- | ----------------------- |
| ~5KB runtime               | ~30KB + build toolchain |
| Works directly in browsers | Requires compilation    |
| Simple decorators          | More complex setup      |
| Standard Web Components    | Stencil-specific APIs   |
| Vite/Rollup friendly       | Custom compiler         |

**Styling Approach**

Instead of bundling Tailwind (~3MB), we use CSS Custom Properties:

```css
/* Users can theme without Tailwind */
nostr-post-composer {
  --nostr-post-primary: #8b5cf6;
  --nostr-post-border: #e5e7eb;
  --nostr-post-bg: white;
}

/* Or use Tailwind classes if they want */
<nostr-post-composer class="p-4 border rounded-lg shadow-md">
```

Benefits:

- Smaller bundle size
- Works with any CSS framework (Tailwind, Bootstrap, custom CSS)
- No framework lock-in

### 3. Plugin System: Framework-Agnostic

Plugins return DOM elements, not JSX or framework-specific code:

```typescript
export const starsPlugin: NostrUIPlugin = {
  id: "stars",
  type: "number",

  // Returns vanilla HTMLElement
  renderInput: (ctx) => {
    const container = document.createElement("div");
    // ... create DOM elements
    return container;
  },

  renderView: (value, field) => {
    const stars = document.createElement("div");
    // ... create star display
    return stars;
  },
};
```

This works in:

- Lit Web Components ✅
- React (via refs) ✅
- Vue ✅
- Svelte ✅
- Vanilla JS ✅

### 4. Separation of Concerns

```
┌─────────────────────────────────────────┐
│  Your App (React, Vue, Svelte, etc.)   │
│  - Handles signing (NDK, nostr-tools)  │
│  - Manages relay connections            │
│  - UI framework of choice               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  @nostr-post/web (Lit Components)      │
│  - Universal UI layer                   │
│  - Framework-independent                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  @nostr-post/plugins                    │
│  - Render methods (DOM elements)        │
│  - Validation logic                     │
│  - Format/filter utilities              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  @nostr-post/core (Pure Logic)         │
│  - ZERO dependencies                    │
│  - Manifest parsing                     │
│  - Event coordination                   │
│  - Type definitions                     │
└─────────────────────────────────────────┘
```

## Example: Basic App

The `examples/basic` shows the minimal setup:

1. **nostr-login** handles authentication (could use NDK instead)
2. **@nostr-post/web** provides the UI components
3. **@nostr-post/core** coordinates the events
4. Your code signs and publishes

## Tools: Manifest Creator

Located in `tools/manifest-creator/`:

```bash
cd tools/manifest-creator
pnpm dev
```

A standalone visual tool for designing manifests. Can be deployed separately from your app.

## Future: React Package

When we create `@nostr-post/react`, it will be a thin wrapper:

```tsx
import { useNostrPost } from "@nostr-post/react";

function MyComponent() {
  const { NostrComposer } = useNostrPost();

  return <NostrComposer manifest={manifest} onSubmit={handleSubmit} />;
}
```

Under the hood: still using the Web Components, just with React-friendly APIs.

## Summary

- **Core**: Pure logic, zero deps, works everywhere
- **Plugins**: DOM-based rendering, framework-agnostic
- **Web**: Standard Web Components with Lit
- **Your App**: Choose your Nostr library (NDK, nostr-tools, etc.)
- **Styling**: CSS custom properties (Tailwind optional)
