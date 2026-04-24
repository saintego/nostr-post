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
  privateKey,
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

## Plugin Composition Pattern

### The Problem

Venue selection and location picking are similar - both need maps. But they have different search UIs (venue = Nominatim OSM search, geo = geohash input).

### The Solution

**plugin-venue wraps plugin-geo** instead of duplicating logic:

```typescript
// plugin-venue core.ts
export const venue = {
  inputTagName: "np-venue-input",  // Custom input
  viewTagName: "np-venue-view",    // Custom view

  // Emit: geohash + OSM identity tag + address
  extraTagsFn: (fieldId, value, manifest, { pubkey }) => [
    ["g", value.geohash],
    ["i", `osm:node:${value.osmId}`, ""],  // NIP-73
    ["location", value.address]
  ],

  // Reconstruct from tags
  resolveFromTagsFn: (fieldId, tags) => ({
    geohash: tags.find(t => t[0] === "g")?.[1],
    osmId: tags.find(t => t[0] === "i")?.[1]?.replace("osm:node:", ""),
    address: tags.find(t => t[0] === "location")?.[1],
  })
}

// plugin-venue input wraps geo-input
<np-venue-input>
  <input placeholder="Search venues..." @change=${...} />
  <np-geo-input hideSearch="${true}" />  // ← Hide geo search
  <venue-card ${value} />
</np-venue-input>
```

**Benefits:**

- Single source of truth for map UI
- Venue adds search overlay, nothing else
- Both plugins emit/read from tags independently

## Plugin Hooks

### extraTagsFn - Emit Custom Tags

**Use Case:** Plugin needs to emit multiple tags or derived values

```typescript
extraTagsFn?: (
  fieldId: string,
  value: unknown,
  manifest: NostrPostManifest,
  options: { pubkey: string }
) => Array<[string, ...string[]]>
```

**Example:** plugin-geo emits NIP-52 prefix tags

```typescript
extraTagsFn: (fieldId, value, manifest, opts) => [
  ["g", "u09tvw"], // Full precision
  ["g", "u09tv"], // 5 chars (for relay filtering)
  ["g", "u09t"], // 4 chars
  ["g", "u09"], // 3 chars
  ["g", "u0"], // 2 chars
];
```

Coordinator automatically merges all extra tags into the event.

### resolveFromTagsFn - Reconstruct from Tags

**Use Case:** Plugin needs to read back values from event tags

```typescript
resolveFromTagsFn?: (
  fieldId: string,
  tags: Array<[string, ...string[]]>,
  manifest: NostrPostManifest
) => unknown
```

**Example:** plugin-venue reads geo + identity tags

```typescript
resolveFromTagsFn: (fieldId, tags) => {
  const geohash = tags.find((t) => t[0] === "g")?.[1];
  const iTag = tags.find((t) => t[0] === "i")?.[1];

  return {
    geohash,
    osmId: iTag?.replace("osm:node:", ""),
    lat: decodeGeohash(geohash).latitude,
    lon: decodeGeohash(geohash).longitude,
  };
};
```

View component uses this to reconstruct objects from tags.

## Field Visibility Controls

### Three-State Visibility

```typescript
interface FieldVisibility {
  edit: "visible" | "hidden" | "readonly"; // In composer
  view: "visible" | "hidden"; // In viewer
}
```

**Use Cases:**

1. **Author-only notes** (hidden from viewers)

   ```typescript
   visibility: { edit: "visible", view: "hidden" }
   ```

2. **Read-only metadata** (set by system, not user)

   ```typescript
   visibility: { edit: "readonly", view: "visible" }
   ```

3. **Hidden internal fields** (not in manifests or UI)
   ```typescript
   visibility: { edit: "hidden", view: "hidden" }
   ```

### Component-Level Control

Composer also supports props:

- `excludeFields: string[]` - Hide specific fields from form
- `readonlyFields: string[]` - Make fields read-only
- `prefill: Record<string, unknown>` - Pre-populate values

## Manifest Inheritance

Manifests can inherit from one or more parents via the `extends` field, enabling shared base definitions without duplicating fields.

### Single parent

```typescript
const restaurantReview: NostrPostManifest = {
  id: "restaurant-review",
  version: "1.0.0",
  // Full NIP-78 a-tag: "30078:<pubkey>:nostr-post:<manifest-id>"
  // or bare ID for author-agnostic lookup: 'base-review'
  extends: "30078:alice_pubkey:nostr-post:base-review",
  fields: [
    // Override just the label; other metadata keys are inherited from parent
    {
      id: "body",
      uiPlugin: "textarea",
      mapTo: { kind: 1, target: "content" },
      metadata: { label: "Restaurant Review" },
    },
    // Append a new field not in the parent
    {
      id: "cuisine",
      uiPlugin: "hashtag",
      mapTo: { kind: 1, target: "tag", tagName: "t" },
    },
  ],
};
```

### Multiple parents

When two orthogonal concerns belong to the same form, use an array. Parents are merged **left-to-right** (rightmost sibling wins on conflict), then the child is applied on top:

```typescript
const coffeeInCafe: NostrPostManifest = {
  id: "coffee-in-cafe",
  version: "1.0.0",
  extends: [
    "30078:alice_pubkey:nostr-post:coffee-review", // left — lower priority
    "30078:alice_pubkey:nostr-post:cafe-visit", // right — wins on conflict
  ],
  fields: [
    // Override the shared 'notes' field label from both parents
    {
      id: "notes",
      uiPlugin: "textarea",
      mapTo: { kind: 1, target: "content" },
      metadata: {
        label: "Review",
        placeholder: "How was the coffee and the cafe?",
      },
    },
  ],
};
```

This avoids the awkward chain `coffee-review extends cafe-visit` (which would imply one is a sub-type of the other) without duplicating fields.

### Merge rules (applied by `resolveManifest`)

| Property         | Rule                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `version`  | Child's value always wins                                                                                                                               |
| `fields`         | Parent fields are the base; child overrides by `id`; field `metadata` is **shallow-merged** (child patches individual keys); child-only fields appended |
| `publishFormats` | Same override-then-append as fields                                                                                                                     |
| `metadata`       | Shallow-merged; child wins on conflicts                                                                                                                 |
| `linkManifest`   | Child takes priority; falls back to parent                                                                                                              |
| `extends`        | Consumed and **not** forwarded to the resolved manifest                                                                                                 |

For array `extends`, sibling parents are merged in the same left-to-right fashion before the child is applied.

### Fetching and resolving at runtime

`fetchManifestByATag` (from `@nostr-post/signer`) always returns a fully resolved manifest — it walks the entire `extends` chain automatically, fetching parents in parallel where possible:

```typescript
import { fetchManifestByATag } from "@nostr-post/signer";

const stored = await fetchManifestByATag(
  "30078:<pubkey>:nostr-post:coffee-in-cafe",
  ["wss://relay.example"],
);
// stored.manifest is the fully-merged definition, ready to use
```

There is no separate "fetch raw" vs "fetch resolved" API — the resolved result is always what callers get.

### Cycle and depth protection

`fetchManifestByATag` tracks visited manifest IDs in a `Set` and enforces a hard depth limit of **10** levels. If a cycle or an overly deep chain is detected, inheritance stops at the offending node and a `console.warn` is emitted. The partial manifest is returned rather than throwing, so the UI still renders.

## Supported NIPs

| NIP        | Purpose                      | How                                                |
| ---------- | ---------------------------- | -------------------------------------------------- |
| **NIP-01** | Base protocol                | All events build on this                           |
| **NIP-07** | Browser extension signing    | useNostrAuth() connects to window.nostr            |
| **NIP-23** | Kind 30023 (articles)        | Manifest publishFormats: [{ kinds: [30023] }]      |
| **NIP-52** | Geohash prefix tags          | plugin-geo emits ["g", "u09"], ["g", "u09t"], etc. |
| **NIP-73** | External identity (`i` tags) | plugin-venue emits ["i", "osm:node:123"]           |
| **NIP-78** | Kind 30078 (app data)        | manifestRef links composer to manifest event       |
| **NIP-98** | HTTP auth (kind 27235)       | plugin-media signs upload to nostr.build           |
