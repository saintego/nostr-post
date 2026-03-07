# nostr-post Usage Guide

Complete guide for using nostr-post packages in your projects.

## Overview

nostr-post provides a manifest-driven architecture for creating and viewing complex Nostr content. This guide covers installation, setup, and usage for each package.

---

## Package Overview

| Package                 | Use Case             | Best For                            |
| ----------------------- | -------------------- | ----------------------------------- |
| **@nostr-post/core**    | Headless logic       | Server-side, custom implementations |
| **@nostr-post/signer**  | Signing & publishing | Browser-based signing with NIP-07   |
| **@nostr-post/plugins** | Plugin system        | Creating custom UI plugins          |
| **@nostr-post/web**     | Web Components       | Any web project, framework-agnostic |
| **@nostr-post/react**   | React components     | React, Next.js applications         |

---

## @nostr-post/core

Pure TypeScript logic for manifest validation and event coordination. Zero dependencies.

### Installation

```bash
npm install @nostr-post/core
```

### Basic Usage

```typescript
import { coordinateEvents, validateManifest } from "@nostr-post/core";
import type { NostrPostManifest } from "@nostr-post/core/types";

// 1. Define your manifest
const manifest: NostrPostManifest = {
  id: "my-app-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "content",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 1, target: "content" },
      required: true,
    },
  ],
};

// 2. Validate manifest
const validation = validateManifest(manifest);
if (!validation.success) {
  throw new Error(validation.error);
}

// 3. Create events from form data
const result = coordinateEvents(
  manifest,
  { content: "Hello, Nostr!" },
  {
    pubkey: "your-pubkey-hex",
    createdAt: Math.floor(Date.now() / 1000),
  },
);

if (result.success) {
  const { events } = result.data;
  // Sign and publish events...
}
```

### API Reference

#### `coordinateEvents(manifest, formData, options)`

Creates unsigned Nostr events based on manifest and form data.

**Parameters:**

- `manifest: NostrPostManifest` - Your manifest definition
- `formData: Record<string, unknown>` - Form data matching manifest fields
- `options: { pubkey: string, createdAt: number }` - Event metadata

**Returns:**

```typescript
{
  success: true,
  data: { events: UnsignedNostrEvent[] }
} | {
  success: false,
  error: string
}
```

#### `validateManifest(manifest)`

Validates a manifest structure.

**Parameters:**

- `manifest: NostrPostManifest` - Manifest to validate

**Returns:**

```typescript
{ success: true } | { success: false, error: string }
```

#### `getFieldsByKind(manifest, kind)`

Returns all fields that map to a specific event kind.

**Parameters:**

- `manifest: NostrPostManifest`
- `kind: number` - Event kind (1, 30078, 30023, etc.)

**Returns:**

```typescript
PostField[]
```

#### `getRequiredFields(manifest)`

Returns all required fields from a manifest.

**Parameters:**

- `manifest: NostrPostManifest`

**Returns:**

```typescript
PostField[]
```

### Advanced: Working with NIP-78

```typescript
import { setNip78Value, getNip78Value } from "@nostr-post/core/nip78";

const data = {};
setNip78Value(data, "venue.name", "Mario's");
setNip78Value(data, "venue.location.lat", 40.7128);

console.log(data);
// { venue: { name: "Mario's", location: { lat: 40.7128 } } }

const name = getNip78Value(data, "venue.name"); // "Mario's"
```

---

## @nostr-post/signer

NIP-07 browser extension integration for signing and publishing events.

### Installation

```bash
npm install @nostr-post/signer
```

### Basic Usage

```typescript
import { NostrSigner } from "@nostr-post/signer";

const signer = new NostrSigner();

// Check if extension is available
if (await signer.isAvailable()) {
  // Get public key
  const pubkey = await signer.getPublicKey();

  // Sign an event
  const signedEvent = await signer.signEvent(unsignedEvent);

  // Publish to relays
  await signer.publishEvent(signedEvent, [
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
  ]);
}
```

### API Reference

#### `isAvailable()`

Check if NIP-07 extension is available.

**Returns:** `Promise<boolean>`

#### `getPublicKey()`

Get user's public key from extension.

**Returns:** `Promise<string>` - Hex-encoded public key

#### `signEvent(event)`

Sign an unsigned event.

**Parameters:**

- `event: UnsignedNostrEvent`

**Returns:** `Promise<NostrEvent>` - Signed event

#### `publishEvent(event, relays)`

Publish a signed event to relays.

**Parameters:**

- `event: NostrEvent` - Signed event
- `relays: string[]` - Array of relay URLs

**Returns:** `Promise<void>`

---

## @nostr-post/web

Framework-independent Web Components built with Lit.

### Installation

```bash
npm install @nostr-post/web
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import "@nostr-post/web";
    </script>
  </head>
  <body>
    <!-- Composer for creating posts -->
    <nostr-post-composer></nostr-post-composer>

    <!-- View single event -->
    <nostr-post-view></nostr-post-view>

    <!-- Feed of events -->
    <nostr-post-feed kinds="1" limit="20"></nostr-post-feed>
  </body>
</html>
```

### Components

#### `<nostr-post-composer>`

Create and publish Nostr posts.

**Attributes:**

- `manifest` - Manifest JSON string or object
- `pubkey` - User's public key (optional, will prompt if not provided)
- `theme-primary-color` - Primary color for theming
- `theme-background-color` - Background color
- `theme-border-radius` - Border radius

**Properties:**

- `manifest: NostrPostManifest` - Set manifest programmatically

**Events:**

- `nostr-post-submit` - Fired when post is published
  ```typescript
  event.detail = { events: NostrEvent[] }
  ```
- `nostr-post-error` - Fired on error
  ```typescript
  event.detail = { error: string };
  ```

**Example:**

```html
<nostr-post-composer id="composer"></nostr-post-composer>

<script type="module">
  import '@nostr-post/web';

  const composer = document.getElementById('composer');

  composer.addEventListener('nostr-post-submit', (e) => {
    console.log('Published:', e.detail.events);
  });

  // Set manifest programmatically
  composer.manifest = {
    id: "custom-v1",
    version: "1.0.0",
    requiredKinds: [1],
    fields: [...]
  };
</script>
```

#### `<nostr-post-view>`

Display a single Nostr event with automatic field rendering based on manifest.

**Attributes:**

- `show-tags` - Show event tags (boolean)
- `show-kind` - Show event kind (boolean)
- `show-timestamp` - Show creation timestamp (boolean)

**Properties:**

- `event: NostrEvent` - Event to display
- `manifest: NostrPostManifest` - Manifest to guide field rendering (optional, auto-fetched from event via NIP-78 if not provided)

**Field Visibility**

The view component respects `visibility.view` settings from the manifest:

- `visibility.view = "visible"` (default) — Field is shown to viewers
- `visibility.view = "hidden"` — Field is hidden from viewers (e.g., author draft notes)

**Example:**

```html
<nostr-post-view id="viewer" show-tags="true"></nostr-post-view>

<script>
  const viewer = document.getElementById("viewer");
  
  // Set the manifest to control which fields are displayed
  viewer.manifest = {
    id: "review-v1",
    version: "1.0.0",
    requiredKinds: [1],
    fields: [
      {
        id: "review",
        type: "string",
        uiPlugin: "textarea",
        mapTo: { kind: 1, target: "content" },
        visibility: { view: "visible" }, // Shown to viewers
      },
      {
        id: "internal_notes",
        type: "string",
        uiPlugin: "textarea",
        visibility: { view: "hidden" }, // Author only; hidden from viewers
      },
    ],
  };
  
  // Display the event
  viewer.event = {
    id: "...",
    kind: 1,
    pubkey: "...",
    created_at: 1703865600,
    tags: [],
    content: "Great venue!",
    sig: "...",
  };
</script>
```

**With NIP-78 Auto-Fetch:**

If the event includes a manifest reference (NIP-78 `a` tag), the view component automatically fetches and applies the manifest:

```html
<nostr-post-view id="viewer"></nostr-post-view>

<script>
  // Event includes ["a", "30078:author:review-v1"] tag
  // View component will auto-fetch the manifest from Nostr
  viewer.event = eventWithManifestRef;
</script>
```

#### `<nostr-post-feed>`

Display a feed of Nostr events.

**Attributes:**

- `kinds` - Comma-separated event kinds (e.g., "1,30023")
- `authors` - JSON array of author pubkeys
- `limit` - Maximum number of events to show
- `tags` - JSON object for tag filters

**Events:**

- `nostr-feed-loaded` - Fired when events are loaded
  ```typescript
  event.detail = { events: NostrEvent[] }
  ```

**Example:**

```html
<!-- Feed from specific authors -->
<nostr-post-feed
  authors='["pubkey1", "pubkey2"]'
  kinds="1"
  limit="20"
></nostr-post-feed>

<!-- Feed with hashtag filter -->
<nostr-post-feed kinds="1" tags='{"t": ["nostr"]}' limit="10"></nostr-post-feed>
```

### Advanced Composer Features

#### Field-Level Controls

Control field visibility at two levels:

1. **Manifest-level** (permanent): Define in your manifest via `visibility` property
2. **Component-level** (runtime): Control at the component via HTML attributes or JavaScript properties

##### Approach 1: Manifest-Level Visibility (Recommended)

Define permanent field visibility rules in your manifest:

```typescript
const manifest: NostrPostManifest = {
  id: "venue-review-v1",
  fields: [
    {
      id: "review",
      type: "string",
      visibility: {
        edit: "visible",  // Author can edit
        view: "visible",  // Viewers can see
      },
    },
    {
      id: "geohash",     // Derived from OSM, don't ask user
      type: "geo",
      visibility: {
        edit: "hidden",   // Hide from form
        view: "hidden",   // Don't repeat in view
      },
    },
    {
      id: "author_id",   // Pre-filled, can't change
      type: "string",
      visibility: {
        edit: "readonly", // Visible but read-only
        view: "visible",
      },
    },
  ],
};
```

##### Approach 2: Component-Level Control (Runtime Override)

Override visibility at the component level via HTML attributes or JavaScript:

**Web Components (HTML attributes):**

```html
<!-- Using HTML attributes -->
<nostr-post-composer
  manifest='...'
  exclude-fields='["rating", "tags"]'
  readonly-fields='["author"]'
></nostr-post-composer>
```

**Web Components (JavaScript properties):**

```html
<nostr-post-composer id="composer" manifest='...'></nostr-post-composer>

<script>
  const composer = document.getElementById("composer");

  // Hide fields from the form
  composer.excludeFields = ["rating", "tags"];

  // Make fields read-only
  composer.readonlyFields = ["author"];

  // Pre-fill field values
  composer.prefill = {
    title: "Default Title",
    content: "Pre-filled content...",
    geohash: "u09tvw", // From OSM map selection
  };
</script>
```

**React Component:**

```tsx
import { NostrPostComposer } from "@nostr-post/react";

export function ReviewForm() {
  const [osmData, setOsmData] = useState({ geohash: "u09tvw", osmId: "123" });

  return (
    <NostrPostComposer
      manifest={venueManifest}
      excludeFields={["geohash", "osm_id"]} // Hidden; filled from osmData
      readonlyFields={["author_id"]}
      prefill={{
        author_id: currentUser.pubkey,
        geohash: osmData.geohash, // From map selection
      }}
    />
  );
}
```

**Properties:**

- `excludeFields: string[]` - Hide specific fields from the form
- `readonlyFields: string[]` - Make fields read-only (displayed but not editable)
- `prefill: Record<string, unknown>` - Pre-populate field values

##### When to Use Each Approach

| Scenario | Use | Reason |
|----------|-----|--------|
| Draft-only fields | Manifest `visibility.view = "hidden"` | Permanent business rule |
| Admin/system fields | Manifest `visibility.edit = "readonly"` | Always read-only |
| OSM-derived data | Manifest `visibility.edit = "hidden"` + Component `prefill` | User doesn't enter; filled programmatically |
| Conditional display | Component `excludeFields`/`readonly-fields` | Runtime decision (user role, context) |
| Default values | Field `defaultValue` in manifest | Static defaults |
| Dynamic pre-fill | Component `prefill` | Data from context (OSM, previous post, etc.) |

#### defaultValue in Manifest

Define default field values in the manifest itself:

```typescript
const manifest: NostrPostManifest = {
  id: "post-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "title",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 1, target: "content" },
      defaultValue: "Untitled Post", // ← Sets default
    },
    {
      id: "rating",
      type: "number",
      uiPlugin: "stars",
      mapTo: { kind: 1, target: "rating-tag" },
      defaultValue: 3, // ← Pre-selected rating
    },
  ],
};
```

#### Field Visibility Controls

Control field visibility in edit and view modes:

```typescript
const manifest: NostrPostManifest = {
  id: "article-v1",
  version: "1.0.0",
  requiredKinds: [30023],
  fields: [
    {
      id: "title",
      type: "string",
      visibility: {
        edit: "visible", // Show in editor
        view: "visible", // Show in viewer
      },
    },
    {
      id: "draft-notes",
      type: "string",
      visibility: {
        edit: "visible", // Show in editor
        view: "hidden", // Hide from viewers
      },
    },
    {
      id: "author-name",
      type: "string",
      visibility: {
        edit: "readonly", // Visible but not editable
        view: "visible",
      },
    },
  ],
};
```

### Theming

All components support CSS custom properties for theming:

```css
nostr-post-composer {
  --primary-color: #8b5cf6;
  --background-color: #ffffff;
  --text-color: #1f2937;
  --border-color: #e5e7eb;
  --border-radius: 8px;
}
```

Dark mode is automatically applied when the parent element has class `dark`:

```html
<div class="dark">
  <nostr-post-composer></nostr-post-composer>
</div>
```

---

## @nostr-post/react

React hooks and components for React and Next.js applications.

### Installation

```bash
npm install @nostr-post/react
```

### Hooks

#### `useNostrAuth()`

Handle Nostr authentication with NIP-07 extension.

**Returns:**

```typescript
{
  pubkey: string | null;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: Error | null;
}
```

**Example:**

```tsx
import { useNostrAuth } from "@nostr-post/react";

function App() {
  const { pubkey, login, logout, isLoading } = useNostrAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!pubkey) {
    return <button onClick={login}>Login with Nostr</button>;
  }

  return (
    <div>
      <p>Connected: {pubkey.slice(0, 8)}...</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### `useNostrPublish()`

Publish events with automatic relay coordination.

**Parameters:**

```typescript
{
  manifest?: NostrPostManifest;      // Manifest for multi-event coordination
  relays?: string[];                 // Relay URLs
  manifestRef?: {                    // Store manifest via NIP-78
    kind: number;
    dTag: string;
  };
  onSuccess?: () => void;            // Success callback
  onError?: (error: string) => void; // Error callback
}
```

**Returns:**

```typescript
{
  publish: (formData: Record<string, unknown>) => Promise<NostrEvent[]>;
  publishContent: (content: string) => Promise<NostrEvent[]>; // Simple Kind 1
  isPublishing: boolean;
}
```

**Example:**

```tsx
import { useNostrPublish } from "@nostr-post/react";

function CustomPublisher() {
  const { publish, isPublishing } = useNostrPublish({
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band"],
    onSuccess: () => alert("Published!"),
    onError: (err) => alert(`Error: ${err}`),
  });

  const handleSubmit = async (formData) => {
    await publish(formData);
  };

  return <button disabled={isPublishing}>Publish</button>;
}
```

#### `useNostrEvents()`

Fetch events from relays with filtering.

**Parameters:**

```typescript
{
  kinds?: number[];
  authors?: string[];
  limit?: number;
  relays?: string[];
  enabled?: boolean;  // Pause/resume fetching
  tags?: Record<string, string[]>;  // Tag filters
}
```

**Returns:**

```typescript
{
  events: NostrEvent[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  addEvent: (event: NostrEvent) => void;  // Add local event
}
```

**Example:**

```tsx
import { useNostrEvents } from "@nostr-post/react";

function UserFeed({ pubkey }: { pubkey: string }) {
  const { events, isLoading, refetch } = useNostrEvents({
    authors: [pubkey],
    kinds: [1, 30023],
    limit: 50,
    relays: ["wss://relay.damus.io"],
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {events.map((e) => (
        <div key={e.id}>{e.content}</div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Components

#### `<NostrPostComposer>`

React wrapper for the composer component.

**Props:**

```typescript
{
  pubkey?: string;
  manifest?: NostrPostManifest;
  initialData?: Record<string, unknown>;
  excludeFields?: string[];          // Hide specific fields
  readonlyFields?: string[];         // Make fields read-only
  prefill?: Record<string, unknown>; // Pre-fill field values
  manifestRef?: { kind: number, dTag: string }; // NIP-78 manifest linking
  relays?: string[];                 // Relay URLs for signing
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    borderColor?: string;
  };
  dark?: boolean;                    // Enable dark mode
  onPublish?: (events: NostrEvent[]) => void;
  onError?: (error: string) => void;
  onChange?: (data: Record<string, unknown>) => void;
  style?: React.CSSProperties;
  className?: string;
}
```

**Example:**

```tsx
import { NostrPostComposer } from "@nostr-post/react";

function App({ pubkey }: { pubkey: string }) {
  return (
    <NostrPostComposer
      pubkey={pubkey}
      onPublish={(events) => {
        console.log("Published:", events);
        alert("Post published!");
      }}
      onError={(error) => {
        console.error("Error:", error);
      }}
      theme={{
        primaryColor: "#8b5cf6",
        borderRadius: "12px",
      }}
    />
  );
}
```

#### `<NostrPostView>`

Display a single Nostr event.

**Props:**

```typescript
{
  event: NostrEvent;
  manifest?: NostrPostManifest;      // Optional manifest for structured display
  excludeFields?: string[];          // Hide specific fields from display
  linkedEvents?: NostrEvent[];       // Related events (NIP-78 linked)
  showTags?: boolean;                // Show event tags
  showKind?: boolean;                // Show event kind
  showTimestamp?: boolean;           // Show creation timestamp
  dark?: boolean;                    // Enable dark mode
  relays?: string[];                 // Relay URLs for fetching manifest
  style?: React.CSSProperties;
  className?: string;
}
```

**Features:**

- Automatically fetches manifest from NIP-78 if not provided
- Auto-detects and renders linked events
- Applies field-level visibility controls
- Uses plugin-specific view components

**Example:**

```tsx
import { NostrPostView } from "@nostr-post/react";

function EventDisplay({ event }: { event: NostrEvent }) {
  return (
    <NostrPostView
      event={event}
      excludeFields={["draft-notes"]} // Hide sensitive fields
      showTags={true}
      showTimestamp={true}
      dark={true}
    />
  );
}
```

#### `<NostrPostFeed>`

Display a feed of events.

**Props:**

```typescript
{
  authors?: string[];
  kinds?: number[];
  tags?: Record<string, string[]>;
  limit?: number;
  manifest?: NostrPostManifest;
  onEventsLoaded?: (events: NostrEvent[]) => void;
  style?: React.CSSProperties;
  className?: string;
}
```

**Example:**

```tsx
import { NostrPostFeed } from "@nostr-post/react";

function UserFeed({ pubkey }: { pubkey: string }) {
  return (
    <NostrPostFeed
      authors={[pubkey]}
      kinds={[1]}
      limit={20}
      onEventsLoaded={(events) => {
        console.log("Loaded", events.length, "events");
      }}
    />
  );
}
```

### Complete React Example

```tsx
import {
  NostrPostComposer,
  NostrPostFeed,
  useNostrAuth,
} from "@nostr-post/react";
import type { NostrPostManifest } from "@nostr-post/core/types";

const manifest: NostrPostManifest = {
  id: "blog-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "content",
      type: "string",
      uiPlugin: "markdown",
      mapTo: { kind: 1, target: "content" },
      required: true,
    },
  ],
};

export default function App() {
  const { pubkey, login, logout, isLoading } = useNostrAuth();

  if (isLoading) {
    return <div>Connecting...</div>;
  }

  if (!pubkey) {
    return (
      <div>
        <h1>My Nostr Blog</h1>
        <button onClick={login}>Login with Nostr</button>
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1>My Nostr Blog</h1>
        <button onClick={logout}>Logout</button>
      </header>

      <section>
        <h2>Create Post</h2>
        <NostrPostComposer
          pubkey={pubkey}
          manifest={manifest}
          onPublish={() => alert("Published!")}
        />
      </section>

      <section>
        <h2>Your Posts</h2>
        <NostrPostFeed authors={[pubkey]} kinds={[1]} limit={50} />
      </section>
    </div>
  );
}
```

### Next.js Setup

For Next.js 13+ with App Router:

```tsx
// app/page.tsx
"use client";

import { NostrPostComposer, useNostrAuth } from "@nostr-post/react";

export default function Home() {
  const { pubkey, login } = useNostrAuth();

  return (
    <main>
      {!pubkey ? (
        <button onClick={login}>Login</button>
      ) : (
        <NostrPostComposer pubkey={pubkey} />
      )}
    </main>
  );
}
```

---

## @nostr-post/plugins

Plugin system for creating custom UI plugins.

### Installation

```bash
npm install @nostr-post/plugins
```

### Using Existing Plugins

```typescript
import { getPlugin } from "@nostr-post/plugins/registry";

const starsPlugin = getPlugin("stars");
const markdownPlugin = getPlugin("markdown");
const geoPlugin = getPlugin("geo");
```

### Available Plugins

#### **stars** - Star Rating Input

Rate items on a scale (1-5, customizable).

**Field Configuration:**

```typescript
{
  id: "rating",
  type: "number",
  uiPlugin: "stars",
  mapTo: { kind: 1, target: "rating-tag" },
  metadata: { max: 5 }  // Default: 5
}
```

**Tag Format:** Single `["rating", "3/5"]` tag

**View Output:** `★★★☆☆ 3/5`

#### **geo** - Geographic Location Picker

Select location via map or geohash string (NIP-52 compatible).

**Field Configuration:**

```typescript
{
  id: "location",
  type: "string",
  uiPlugin: "geo",
  mapTo: { kind: 1, target: "geohash-tag" },
  metadata: { precision: 6 }  // Geohash length (4-8)
}
```

**Component Props:**

- `hideSearch: boolean` - Hide search bar (used by venue plugin to wrap geo)

**Tag Format:**

- Primary: `["g", "u09tvw"]` (geohash)
- NIP-52 Prefix Tags: `["g", "u09tv"]`, `["g", "u09t"]`, etc. (auto-generated for relay filtering)

**Features:**

- Interactive Leaflet map
- Auto "Use my location" button
- Automatic prefix tag generation
- OSM + Google Maps links in view

**Example:**

```typescript
{
  id: "venue",
  type: "string",
  uiPlugin: "geo",
  mapTo: { kind: 30023, target: "geohash-tag" },
  metadata: { precision: 7 },
  defaultValue: "u09tvw"  // Pre-set location
}
```

#### **venue** - Venue/Business Selection

Search and select venues (wraps geo, adds OSM integration).

**Field Configuration:**

```typescript
{
  id: "venue",
  type: "string",
  uiPlugin: "venue",
  mapTo: { kind: 30023, target: "venue" },
  metadata: { precision: 8 }
}
```

**Tag Format:**

- Location: `["g", "u09tvw"]` + NIP-52 prefixes
- Identity: `["i", "osm:node:12345", ""]` (NIP-73 external ID)
- Address: `["location", "123 Main St, City"]`

**Features:**

- Nominatim OpenStreetMap search
- Venue information display (name, address, OSM ID)
- Links to OSM and Google Maps
- Composition over duplication (wraps geo plugin)

**Example:**

```typescript
{
  id: "restaurant",
  type: "string",
  uiPlugin: "venue",
  mapTo: { kind: 30023, target: "venue" },
  defaultValue: "u09tvw"
}
```

#### **media** - Media Upload (Images/Videos)

Upload and manage image and video files with array support.

**Field Configuration:**

```typescript
{
  id: "photos",
  type: "array",  // Must be array type
  uiPlugin: "media",
  mapTo: { kind: 1, target: "image-tags" },
  metadata: {
    maxFiles: 10,
    acceptedTypes: ["image/*", "video/*"]
  }
}
```

**Tag Format:** Multiple `["r", "https://example.com/image.jpg"]` tags

**Features:**

- Drag-and-drop file upload
- Multi-file picker
- URL paste support
- NIP-98 authenticated upload to nostr.build
- Image gallery with lightbox
- Video player with controls
- Auto-detection of image/video types

**Example:**

```typescript
{
  id: "gallery",
  type: "array",
  uiPlugin: "media",
  mapTo: { kind: 30023, target: "image-tags" },
  metadata: { maxFiles: 20 }
}
```

#### **markdown** - Markdown Editor

Rich text editor with live preview and HTML rendering.

**Field Configuration:**

```typescript
{
  id: "content",
  type: "string",
  uiPlugin: "markdown",
  mapTo: { kind: 30023, target: "content" },
  metadata: {
    wysiwyg: true,      // Enable WYSIWYG mode toggle
    maxLength: 50000
  }
}
```

**Tag Format:** Single content field (usually Kind 30023 `content` target)

**Features:**

- Toolbar (Bold, Italic, Headings, Code, Links, Separator)
- Split-pane editor (left input, right preview)
- Raw HTML / WYSIWYG toggle
- Live character count
- Auto-formatting

**Example:**

```typescript
{
  id: "article",
  type: "string",
  uiPlugin: "markdown",
  mapTo: { kind: 30023, target: "content" },
  defaultValue: "# Untitled Article\n\n",
}
```

#### **hashtag** - Hashtag Array Input

Add and manage hashtags with array support.

**Field Configuration:**

```typescript
{
  id: "tags",
  type: "array",  // Must be array type
  uiPlugin: "hashtag",
  mapTo: { kind: 1, target: "hashtag-tags" }
}
```

**Tag Format:** Multiple `["t", "nostr"]` tags

**Features:**

- Inline chip editor
- Enter/comma adds tags
- Backspace removes tags
- Auto-extracted from Kind 1 content
- Clickable tags (future: search integration)

**Example:**

```typescript
{
  id: "topics",
  type: "array",
  uiPlugin: "hashtag",
  mapTo: { kind: 1, target: "hashtag-tags" },
  defaultValue: ["nostr", "bitcoin"]
}
```

### Creating Custom Plugins

See [PLUGINS.md](./PLUGINS.md) for detailed guide on creating custom plugins.

### Plugin Hooks

#### `extraTags` Hook

Emit additional tags when a field value changes (advanced field transformations).

**Use Case:** Plugin venue needs to emit both geohash tags (`g`) and identity tags (`i`).

**Function Signature:**

```typescript
extraTagsFn?: (
  fieldId: string,
  value: unknown,
  manifest: NostrPostManifest,
  options: { pubkey: string }
) => Array<[string, ...string[]]>
```

**Example Implementation:**

```typescript
// In plugin-venue core.ts
export const venue = {
  inputTagName: "np-venue-input",
  viewTagName: "np-venue-view",
  extraTagsFn: (fieldId, value, manifest, { pubkey }) => {
    const venueName = value.name;
    const geohash = value.geohash;
    const osmId = value.osmId;

    return [
      ["g", geohash], // Geohash tag
      ["i", `osm:node:${osmId}`, ""], // NIP-73 identity
      ["location", value.address], // Readable address
    ];
  },
};
```

#### `resolveFromTags` Hook

Reconstruct field values from event tags (inverse of extraTags).

**Use Case:** Plugin venue needs to read `g` + `i` + `location` tags and build venue object.

**Function Signature:**

```typescript
resolveFromTagsFn?: (
  fieldId: string,
  tags: Array<[string, ...string[]]>,
  manifest: NostrPostManifest
) => unknown
```

**Example Implementation:**

```typescript
// In plugin-venue core.ts
export const venue = {
  inputTagName: "np-venue-input",
  viewTagName: "np-venue-view",
  resolveFromTagsFn: (fieldId, tags) => {
    const gTag = tags.find((t) => t[0] === "g")?.[1];
    const iTag = tags.find((t) => t[0] === "i")?.[1];
    const locationTag = tags.find((t) => t[0] === "location")?.[1];

    return {
      geohash: gTag,
      osmId: iTag?.replace("osm:node:", ""),
      address: locationTag,
      lat: decodeGeohash(gTag).latitude,
      lon: decodeGeohash(gTag).longitude,
    };
  },
};
```

### Supported NIPs

| NIP        | Purpose                   | Support                                       |
| ---------- | ------------------------- | --------------------------------------------- |
| **NIP-01** | Base Protocol             | Full - Core event structure                   |
| **NIP-07** | Nostr Sign-in Flow        | Full - Browser extension signing              |
| **NIP-23** | Kind 30023 (Long-form)    | Full - Article/Blog posting                   |
| **NIP-52** | Relay Hints with Geohash  | Full - Geo plugin emits prefix tags           |
| **NIP-73** | External Identity         | Full - Venue plugin uses `i` tags for OSM IDs |
| **NIP-78** | Application-Specific Data | Full - Manifest storage & discovery           |
| **NIP-98** | HTTP File Server Auth     | Full - Media plugin uses for nostr.build      |

**NIP-78 Usage Example:**

Store and retrieve manifests:

```typescript
import { manifestToEvent, eventToManifest } from "@nostr-post/core";

// Create manifest event (Kind 30078)
const manifestEvent = manifestToEvent(manifest, {
  pubkey: "your-pubkey",
  createdAt: Math.floor(Date.now() / 1000),
  dTag: "post-manifest-v1",
});

// Sign and publish to relay...

// Later, fetch and parse manifest
const event = await fetchManifestFromRelay();
const recoveredManifest = eventToManifest(event);
```

---

## Common Patterns

### Pattern 1: Draft Saving with Auto-Recovery

```tsx
import { useState, useEffect } from "react";
import { NostrPostComposer } from "@nostr-post/react";

function DraftComposer({ pubkey }: { pubkey: string }) {
  const [draft, setDraft] = useState({});
  const DRAFT_KEY = "nostr-post-draft";

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        setDraft(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to restore draft");
      }
    }
  }, []);

  return (
    <NostrPostComposer
      pubkey={pubkey}
      prefill={draft}
      onChange={(data) => {
        setDraft(data);
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      }}
      onPublish={() => {
        localStorage.removeItem(DRAFT_KEY);
        alert("Published! Draft cleared.");
      }}
    />
  );
}
```

### Pattern 2: Multi-Kind Coordination with Manifest Linking

```tsx
import { NostrPostComposer } from "@nostr-post/react";
import type { NostrPostManifest } from "@nostr-post/core/types";

const articleManifest: NostrPostManifest = {
  id: "article-v1",
  version: "1.0.0",
  requiredKinds: [30023, 30078], // Article + Manifest
  fields: [
    {
      id: "title",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 30023, target: "title" },
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
      id: "summary",
      type: "string",
      mapTo: { kind: 30023, target: "summary" },
    },
  ],
};

export function ArticlePublisher({ pubkey }: { pubkey: string }) {
  return (
    <NostrPostComposer
      pubkey={pubkey}
      manifest={articleManifest}
      manifestRef={{
        kind: 30078,
        dTag: "article-manifest-v1",
      }}
      relays={["wss://relay.damus.io", "wss://relay.nostr.band"]}
      onPublish={(events) => {
        console.log(`Published ${events.length} events`);
      }}
    />
  );
}
```

### Pattern 3: Field Visibility & Read-Only Fields

```tsx
import { NostrPostComposer, NostrPostView } from "@nostr-post/react";
import type { NostrPostManifest } from "@nostr-post/core/types";

const manifest: NostrPostManifest = {
  id: "review-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "subject",
      type: "string",
      visibility: {
        edit: "visible",
        view: "visible",
      },
    },
    {
      id: "rating",
      type: "number",
      uiPlugin: "stars",
      visibility: {
        edit: "visible",
        view: "visible",
      },
    },
    {
      id: "private-notes",
      type: "string",
      visibility: {
        edit: "visible",
        view: "hidden", // ← Only visible to author
      },
    },
    {
      id: "reviewer-name",
      type: "string",
      visibility: {
        edit: "readonly", // ← Show but don't edit
        view: "visible",
      },
    },
  ],
};

export function ReviewPublisher({ pubkey }: { pubkey: string }) {
  return (
    <NostrPostComposer
      pubkey={pubkey}
      manifest={manifest}
      readonlyFields={["reviewer-name"]}
      prefill={{ "reviewer-name": "Your Name" }}
    />
  );
}
```

### Pattern 4: Complex Form with Arrays

```tsx
import { NostrPostComposer } from "@nostr-post/react";
import type { NostrPostManifest } from "@nostr-post/core/types";

const eventManifest: NostrPostManifest = {
  id: "event-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "event-name",
      type: "string",
      mapTo: { kind: 1, target: "content" },
      required: true,
    },
    {
      id: "venue",
      type: "string",
      uiPlugin: "venue",
      mapTo: { kind: 1, target: "venue" },
    },
    {
      id: "photos",
      type: "array", // ← Array type
      uiPlugin: "media",
      mapTo: { kind: 1, target: "image-tags" },
      metadata: { maxFiles: 10 },
    },
    {
      id: "topics",
      type: "array", // ← Array type
      uiPlugin: "hashtag",
      mapTo: { kind: 1, target: "hashtag-tags" },
      defaultValue: ["event"],
    },
  ],
};

export function EventPublisher({ pubkey }: { pubkey: string }) {
  return (
    <NostrPostComposer
      pubkey={pubkey}
      manifest={eventManifest}
      prefill={{
        topics: ["nostr", "bitcoin", "event"],
      }}
    />
  );
}
```

### Pattern 5: Custom Validation Before Publishing

```typescript
import { coordinateEvents, validateManifest } from "@nostr-post/core";
import type { NostrPostManifest } from "@nostr-post/core/types";

async function publishWithValidation(
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  pubkey: string,
) {
  // 1. Validate manifest structure
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.success) {
    throw new Error(`Invalid manifest: ${manifestValidation.error}`);
  }

  // 2. Custom business logic validation
  if (formData.content && (formData.content as string).length < 10) {
    throw new Error("Content must be at least 10 characters");
  }

  if (manifest.id.includes("article") && !formData.title) {
    throw new Error("Articles require a title");
  }

  // 3. Coordinate events
  const result = coordinateEvents(manifest, formData, {
    pubkey,
    createdAt: Math.floor(Date.now() / 1000),
  });

  if (!result.success) {
    throw new Error(`Event coordination failed: ${result.error}`);
  }

  return result.data.events;
}
```

---

## Best Practices

1. **Always validate manifests** before using them in production

   ```typescript
   const validation = validateManifest(manifest);
   if (!validation.success) throw new Error(validation.error);
   ```

2. **Use TypeScript** for better type safety and autocomplete

   ```typescript
   import type { NostrPostManifest, PostField } from "@nostr-post/core/types";
   ```

3. **Define default values in manifests** rather than component props

   ```typescript
   const field: PostField = {
     defaultValue: "Initial value",
     // ← Preferred over prefill component prop
   };
   ```

4. **Leverage field visibility** for sensitive or administrative fields

   ```typescript
   visibility: {
     edit: "visible",   // Author can edit
     view: "hidden"     // Hidden from viewers
   }
   ```

5. **Use plugin hooks** (extraTags, resolveFromTags) for complex field transformations
   - Don't manually transform tags in component code
   - Let plugins handle their own serialization/deserialization

6. **Enable NIP-78 manifest linking** for complex multi-event forms

   ```typescript
   <NostrPostComposer
     manifestRef={{ kind: 30078, dTag: "my-manifest-v1" }}
   />
   ```

7. **Provide feedback during signing and publishing**

   ```tsx
   const { isPublishing } = useNostrPublish();
   return (
     <button disabled={isPublishing}>
       {isPublishing ? "Publishing..." : "Publish"}
     </button>
   );
   ```

8. **Use arrays only with array-capable plugins** (media, hashtag)

   ```typescript
   // ✅ Correct
   { type: "array", uiPlugin: "media" }

   // ❌ Wrong
   { type: "array", uiPlugin: "textarea" }
   ```

9. **Exclude sensitive fields from public view**

   ```tsx
   <NostrPostView excludeFields={["draft-notes", "private-metadata"]} />
   ```

10. **Test with multiple relays** for reliability

    ```typescript
    const relays = [
      "wss://relay.damus.io",
      "wss://relay.nostr.band",
      "wss://nostr.wine",
    ];
    ```

11. **Use semantic versioning** for manifest IDs

    ```typescript
    id: "my-app-v1",      // Version in ID
    version: "1.0.0",     // Semantic version field
    ```

12. **Save drafts locally** to prevent data loss
    ```typescript
    onChange={(data) => {
      localStorage.setItem('draft', JSON.stringify(data));
    }}
    ```

---

## Troubleshooting

### "No NIP-07 extension found"

Make sure users have a Nostr extension installed and properly configured.

**Solution:**

```tsx
import { useNostrAuth } from '@nostr-post/react';

function AppWithFallback() {
  const { pubkey, error } = useNostrAuth();

  if (error?.message.includes('NIP-07')) {
    return (
      <div role="alert" style={{ padding: '1rem', background: '#fee' }}>
        <p>Please install a Nostr extension:</p>
        <ul>
          <li><a href="https://getalby.com">Alby</a> - Recommended</li>
          <li><a href="https://github.com/fiatjaf/nos2x">nos2x</a></li>
          <li><a href="https://www.flamingo.app">Flamingo</a></li>
        </ul>
      </div>
    );
  }

  return pubkey ? <App pubkey={pubkey} /> : <button onClick={...}>Login</button>;
}
```

### "Manifest validation failed"

Check your manifest structure for required fields and valid types.

**Solution:**

```typescript
import { validateManifest } from "@nostr-post/core";

const validation = validateManifest(manifest);
if (!validation.success) {
  console.error("Validation error:", validation.error);
  console.error("Full manifest:", manifest);

  // Common issues:
  // 1. Missing required fields (id, version, requiredKinds, fields)
  // 2. Field without mapTo
  // 3. Invalid plugin name
  // 4. Array type with non-array plugin
}
```

### "Events not appearing in feed"

Check relay connectivity, event publishing, and filter matching.

**Debugging Steps:**

```typescript
import { useNostrEvents } from "@nostr-post/react";

const { events, isLoading } = useNostrEvents({
  kinds: [1],
  authors: ["your-pubkey"],
  relays: ["wss://relay.damus.io"],
});

console.log("Loading:", isLoading);
console.log("Events found:", events.length);
console.log("Sample event:", events[0]);

// Check:
// 1. Relay URL is correct and accessible
// 2. Kind numbers match your events
// 3. Author pubkey is correct (hex format)
// 4. Wait 5+ seconds after publishing for relay propagation
```

### "Media upload returns 401 Unauthorized"

The NIP-98 authentication header might be missing or invalid.

**Solution:**

```typescript
// Media plugin automatically handles NIP-98 signing
// If upload fails:
// 1. Ensure NIP-07 extension is connected
// 2. Check that nostr.build is accessible
// 3. Verify file size limits (~50MB typical)

// For custom uploads, manually implement NIP-98:
import { signEvent } from "@nostr-post/signer";

const httpEvent = {
  kind: 27235,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ["u", "https://nostr.build/upload"],
    ["method", "POST"],
  ],
  content: "",
  pubkey: "your-pubkey",
};

const signed = await signEvent(httpEvent);
const auth = `Nostr ${btoa(JSON.stringify(signed))}`;

// Use auth header in fetch request
```

### "Readonly fields not working"

Ensure readonly field values are set via `prefill` not `onChange`.

**Solution:**

```tsx
// ✅ Correct
<NostrPostComposer
  readonlyFields={["author-name"]}
  prefill={{ "author-name": "Alice" }}
/>

// ❌ Wrong - won't prevent editing
<NostrPostComposer
  readonlyFields={["author-name"]}
  initialData={{ "author-name": "Alice" }}
/>
```

### "Field value not showing in view"

Check field visibility settings and manifest linkage.

**Solution:**

```typescript
// 1. Check visibility settings
const field: PostField = {
  visibility: {
    edit: "visible",
    view: "visible"    // Must be "visible" to show
  }
};

// 2. If using NIP-78 manifest, ensure it was properly saved
composer.manifestRef = { kind: 30078, dTag: "my-manifest-v1" };

// 3. Use excludeFields carefully
<NostrPostView
  excludeFields={["private-data"]}  // Don't exclude display fields
/>
```

### "Dark mode not applying"

The dark mode selector requires specific CSS setup.

**Solution:**

```tsx
// Option 1: Wrap component in dark div
<div className="dark">
  <NostrPostComposer />
</div>

// Option 2: Use dark prop (React only)
<NostrPostComposer dark={true} />

// Option 3: Add CSS
document.querySelector('nostr-post-composer')?.classList.add('dark');

// Ensure CSS supports :host-context(.dark)
css`
  :host-context(.dark) {
    --background-color: #1a1a1a;
    --text-color: #ffffff;
  }
`
```

### "Plugin not rendering"

Ensure plugin is imported and registered.

**Solution:**

```typescript
// ✅ Correct - import registers plugin
import "@nostr-post/plugin-geo"; // Side effect registration
import { NostrPostComposer } from "@nostr-post/react";

// ❌ Wrong - plugin not registered
import { NostrPostComposer } from "@nostr-post/react";
// Missing: import '@nostr-post/plugin-geo';

// Verify plugin is registered:
import { getPlugin } from "@nostr-post/plugins/registry";
console.log(getPlugin("geo")); // Should not be null
```

---

## Next Steps

- 📖 [Quick Start Guide](./QUICKSTART.md) - Get started quickly
- 💡 [Examples](./EXAMPLES.md) - See complete code examples
- 🏗️ [Architecture](./ARCHITECTURE.md) - Understand the design
- 🔌 [Plugins Guide](./PLUGINS.md) - Create custom plugins

## Support

- 🐛 [Report Issues](https://github.com/saintego/nostr-post/issues)
- 💬 [Discussions](https://github.com/saintego/nostr-post/discussions)
- 📚 [Main README](./README.md)
