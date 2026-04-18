# nostr-post Examples

This document provides comprehensive examples for using nostr-post across different packages and use cases.

## Table of Contents

1. [Core Package Examples](#core-package-examples)
2. [Web Components Examples](#web-components-examples)
3. [React Package Examples](#react-package-examples)
4. [Complete Application Examples](#complete-application-examples)

---

## Core Package Examples

The `@nostr-post/core` package provides headless logic for manifest-driven event coordination.

### Example 1: Simple Post (Kind 1)

The simplest use case - creating a basic text post.

```typescript
import { coordinateEvents, validateManifest } from "@nostr-post/core";
import type { NostrPostManifest } from "@nostr-post/core/types";

// Define manifest
const simplePostManifest: NostrPostManifest = {
  id: "simple-post-v1",
  version: "1.0.0",
  publishFormats: [
    { id: "default", label: "Default", kinds: [1], default: true },
  ],
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

// Validate manifest
const validation = validateManifest(simplePostManifest);
if (!validation.success) {
  throw new Error(`Invalid manifest: ${validation.error}`);
}

// Create post
const formData = {
  content: "Hello, Nostr! This is my first post using nostr-post.",
};

const result = coordinateEvents(simplePostManifest, formData, {
  pubkey: "your-public-key-hex",
  createdAt: Math.floor(Date.now() / 1000),
});

if (result.success) {
  const { events } = result.data;
  console.log("Generated event:", events[0]);
  // Sign and publish this event...
}
```

### Example 2: Restaurant Review

A complete example showing how to create a restaurant review that splits data across Kind 1 (social) and Kind 30078 (structured data).

```typescript
import { coordinateEvents } from "@nostr-post/core/coordinator";
import type { NostrPostManifest } from "@nostr-post/core/types";

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
      metadata: { min: 1, max: 5 },
    },
    {
      id: "venueName",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "venue.name" },
      required: true,
    },
    {
      id: "venueAddress",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "venue.address" },
    },
    {
      id: "location",
      type: "geo",
      uiPlugin: "map",
      mapTo: { kind: 30078, target: "content", path: "venue.location" },
    },
    {
      id: "cuisine",
      type: "enum",
      uiPlugin: "select",
      mapTo: { kind: 30078, target: "content", path: "venue.cuisine" },
      options: [
        "Italian",
        "Japanese",
        "Mexican",
        "American",
        "French",
        "Other",
      ],
    },
  ],
};

// Usage
const formData = {
  reviewText: "# Amazing Pizza!\n\nBest pizza in town. The crust was perfect!",
  rating: 5,
  venueName: "Mario's Pizzeria",
  venueAddress: "123 Main St, New York, NY",
  location: { lat: 40.7128, lon: -74.006 },
  cuisine: "Italian",
};

const result = coordinateEvents(restaurantReviewManifest, formData, {
  pubkey: "your-public-key-hex",
  createdAt: Math.floor(Date.now() / 1000),
});

if (result.success) {
  const { events } = result.data;
  // events[0]: Kind 1 with review text + rating tag
  // events[1]: Kind 30078 with structured venue data
  console.log("Kind 1 event:", events[0]);
  console.log("Kind 30078 event:", events[1]);
}
```

### Example 3: Long-Form Article (Kind 30023)

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

const articleManifest: NostrPostManifest = {
  id: "article-v1",
  version: "1.0.0",
  publishFormats: [
    { id: "default", label: "Default", kinds: [30023], default: true },
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
      id: "summary",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 30023, target: "tag", tagName: "summary" },
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
      id: "publishedAt",
      type: "number",
      uiPlugin: "datetime",
      mapTo: { kind: 30023, target: "tag", tagName: "published_at" },
    },
  ],
};
```

---

## Web Components Examples

The `@nostr-post/web` package provides framework-independent Web Components.

Built-in plugins are lazy-loaded when a manifest uses them, so manifests using `media`, `hashtag`, `reference`, `stars`, `geo`, `venue`, `markdown`, or `list` work without separate plugin imports and stay SSR-safe.

### Example 1: Basic Composer in HTML

````html
<!DOCTYPE html>
<html lang="en">
  ## PWA Web Share Target Example This repository includes a small PWA example
  that demonstrates using the Web Share Target API with `nostr-post`'s CDN
  bundle. The example registers a share target, receives shared text/files, and
  forwards the payload into a `nostr-post-composer` instance (you can save a
  manifest id or paste manifest JSON which will be stored locally and used by
  the composer). Run locally: ```bash npx serve examples/pwa-share -l 8080 #
  open http://localhost:8080/examples/pwa-share/ ``` The example also
  demonstrates a simple `window.nostr` (NIP-07) login flow to connect the
  composer to a signer provided by the user's browser extension.
  <head>
    <meta charset="UTF-8" />
    <title>Nostr Post Demo</title>
  </head>
  <body>
    <h1>Create a Post</h1>
    <nostr-post-composer></nostr-post-composer>

    <h1>View Posts</h1>
    <nostr-post-feed kinds="1" limit="10"></nostr-post-feed>

    <script type="module">
      import "@nostr-post/web";

      const composer = document.querySelector("nostr-post-composer");

      // Listen for published events
      composer.addEventListener("nostr-post-submit", (e) => {
        console.log("Published events:", e.detail.events);
        alert("Post published successfully!");
      });

      // Listen for errors
      composer.addEventListener("nostr-post-error", (e) => {
        console.error("Error:", e.detail.error);
        alert("Error: " + e.detail.error);
      });
    </script>
  </body>
</html>

### Example: Using `manifestRef` (NIP-78 `a` tag) You can point a composer or
feed at a manifest stored on Nostr by providing an `a`-tag-style manifest
reference. ```html
<!-- a manifestRef is the NIP-01 `a` tag: <kind>:<pubkey>:<d-tag> -->
<nostr-post-composer
  manifest-ref="30078:abcdef...:nostr-post:my-manifest-id"
></nostr-post-composer>

<nostr-post-feed
  manifest-ref="30078:abcdef...:nostr-post:my-manifest-id"
  kinds="1"
  limit="10"
></nostr-post-feed>
````

Or set it from JavaScript:

```js
import "@nostr-post/web";

const composer = document.querySelector("nostr-post-composer");
composer.manifestRef = "30078:abcdef...:nostr-post:my-manifest-id";

const feed = document.querySelector("nostr-post-feed");
feed.manifestRef = "30078:abcdef...:nostr-post:my-manifest-id";
```

When a `manifestRef` is provided the components will fetch the manifest (once, centrally cached) and use it to render fields and plugins. Pass `relays` if you want to override relay list.

````

### Example 2: Composer with Custom Theme

```html
<nostr-post-composer
  id="my-composer"
  theme-primary-color="#8b5cf6"
  theme-background-color="#ffffff"
  theme-border-radius="12px"
></nostr-post-composer>

<script type="module">
  import "@nostr-post/web";

  const composer = document.getElementById("my-composer");

  // Set manifest programmatically
  const manifest = {
    id: "custom-post-v1",
    version: "1.0.0",
    publishFormats: [
      { id: "default", label: "Default", kinds: [1], default: true },
    ],
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

  composer.manifest = manifest;
</script>
````

### Example 3: Feed Component

```html
<!-- Show posts from specific authors -->
<nostr-post-feed
  authors='["pubkey1", "pubkey2"]'
  kinds="1"
  limit="20"
></nostr-post-feed>

<!-- Show posts with specific hashtags -->
<nostr-post-feed
  kinds="1"
  tags='{"t": ["nostr", "bitcoin"]}'
  limit="10"
></nostr-post-feed>

<script type="module">
  import "@nostr-post/web";

  const feed = document.querySelector("nostr-post-feed");

  // Listen for events loaded
  feed.addEventListener("nostr-feed-loaded", (e) => {
    console.log("Loaded events:", e.detail.events);
  });
</script>
```

### Example 3b: Feed with standard comments/reactions

```html
<nostr-post-feed
  authors='["your-pubkey-hex"]'
  kinds="[1]"
  limit="20"
  comments-enabled
  reactions-enabled
></nostr-post-feed>
```

Notes:

- Comments default to `STANDARD_KIND1_POST_MANIFEST` unless `commentManifest` is provided.
- Reaction chips show who reacted when kind 0 profile metadata is available.

### Example 4: View Single Event

```html
<nostr-post-view
  id="event-viewer"
  show-tags="true"
  show-kind="true"
></nostr-post-view>

<script type="module">
  import "@nostr-post/web";

  const viewer = document.getElementById("event-viewer");

  // Set event to display
  viewer.event = {
    id: "event-id-hex",
    kind: 1,
    pubkey: "author-pubkey-hex",
    created_at: 1703865600,
    tags: [["t", "nostr"]],
    content: "Hello, Nostr!",
    sig: "signature-hex",
  };

  // Technical metadata is hidden by default.
  // Turn on manifest/debug visibility when needed:
  viewer.showKind = true;
  viewer.showTags = true;
</script>
```

### Example 5: Composer reply context panel

```html
<nostr-post-composer
  auto-publish
  show-reply-target
  editable-reply-target
  reply-to-event-id="<parent-event-id>"
  reply-to-pubkey="<parent-pubkey>"
  root-event-id="<root-event-id>"
  root-pubkey="<root-pubkey>"
></nostr-post-composer>
```

When no `manifest` is set, composer defaults to `STANDARD_KIND1_POST_MANIFEST`.

---

## React Package Examples

The `@nostr-post/react` package provides React hooks and components.

### Example 1: Basic Authentication and Posting

```tsx
import { NostrPostComposer, useNostrAuth } from "@nostr-post/react";

function App() {
  const { pubkey, login, logout, isLoading } = useNostrAuth();

  if (isLoading) {
    return <div>Connecting to Nostr...</div>;
  }

  return (
    <div>
      <h1>My Nostr App</h1>

      {!pubkey ? (
        <button onClick={login}>Login with Nostr</button>
      ) : (
        <>
          <p>Connected as: {pubkey.slice(0, 8)}...</p>
          <button onClick={logout}>Logout</button>

          <NostrPostComposer
            pubkey={pubkey}
            onPublish={(events) => {
              console.log("Published:", events);
              alert("Post published successfully!");
            }}
            onError={(error) => {
              console.error("Error:", error);
              alert("Error: " + error);
            }}
          />
        </>
      )}
    </div>
  );
}

export default App;
```

### Example 2: Feed with Custom Manifest

```tsx
import { NostrPostFeed, NostrPostComposer } from "@nostr-post/react";
import type { NostrPostManifest } from "@nostr-post/core/types";

const customManifest: NostrPostManifest = {
  id: "blog-post-v1",
  version: "1.0.0",
  publishFormats: [
    { id: "default", label: "Default", kinds: [1], default: true },
  ],
  fields: [
    {
      id: "title",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 1, target: "tag", tagName: "title" },
      required: true,
    },
    {
      id: "content",
      type: "string",
      uiPlugin: "markdown",
      mapTo: { kind: 1, target: "content" },
      required: true,
    },
  ],
};

function BlogApp({ pubkey }: { pubkey: string }) {
  return (
    <div>
      <section>
        <h2>Create Blog Post</h2>
        <NostrPostComposer pubkey={pubkey} manifest={customManifest} />
      </section>

      <section>
        <h2>Your Blog Posts</h2>
        <NostrPostFeed
          authors={[pubkey]}
          kinds={[1]}
          limit={20}
          manifest={customManifest}
        />
      </section>
    </div>
  );
}
```

### Example 3: Custom Styling

```tsx
import { NostrPostComposer } from "@nostr-post/react";

function StyledComposer({ pubkey }: { pubkey: string }) {
  return (
    <NostrPostComposer
      pubkey={pubkey}
      theme={{
        primaryColor: "#8b5cf6",
        backgroundColor: "#ffffff",
        textColor: "#1f2937",
        borderRadius: "12px",
        borderColor: "#e5e7eb",
      }}
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
      }}
    />
  );
}
```

### Example 4: Using Hooks Directly

```tsx
import { useNostrAuth, useNostrSigner } from "@nostr-post/react";
import { coordinateEvents } from "@nostr-post/core/coordinator";

function CustomPostForm() {
  const { pubkey } = useNostrAuth();
  const { signEvent, publishEvent } = useNostrSigner();
  const [content, setContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubkey) return;

    setIsPublishing(true);

    try {
      // Create unsigned event
      const manifest = {
        id: "simple-post-v1",
        version: "1.0.0",
        publishFormats: [
          { id: "default", label: "Default", kinds: [1], default: true },
        ],
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

      const result = coordinateEvents(
        manifest,
        { content },
        {
          pubkey,
          createdAt: Math.floor(Date.now() / 1000),
        },
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Sign and publish
      const signedEvent = await signEvent(result.data.events[0]);
      await publishEvent(signedEvent);

      alert("Post published!");
      setContent("");
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish post");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        disabled={isPublishing}
      />
      <button type="submit" disabled={!pubkey || isPublishing}>
        {isPublishing ? "Publishing..." : "Publish"}
      </button>
    </form>
  );
}
```

---

## Complete Application Examples

### Example 1: Review Platform

```tsx
// ReviewApp.tsx
import { useState } from "react";
import {
  NostrPostComposer,
  NostrPostFeed,
  useNostrAuth,
} from "@nostr-post/react";
import type { NostrPostManifest } from "@nostr-post/core/types";

const reviewManifest: NostrPostManifest = {
  id: "product-review-v1",
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
      metadata: { min: 1, max: 5 },
    },
    {
      id: "productName",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "product.name" },
      required: true,
    },
  ],
};

export function ReviewApp() {
  const { pubkey, login, logout } = useNostrAuth();
  const [view, setView] = useState<"create" | "browse">("browse");

  if (!pubkey) {
    return (
      <div className="login-screen">
        <h1>Product Review Platform</h1>
        <button onClick={login}>Login with Nostr</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Product Reviews</h1>
        <nav>
          <button onClick={() => setView("browse")}>Browse</button>
          <button onClick={() => setView("create")}>Create Review</button>
          <button onClick={logout}>Logout</button>
        </nav>
      </header>

      <main>
        {view === "create" ? (
          <NostrPostComposer
            pubkey={pubkey}
            manifest={reviewManifest}
            onPublish={() => {
              alert("Review published!");
              setView("browse");
            }}
          />
        ) : (
          <NostrPostFeed
            kinds={[1, 30078]}
            limit={50}
            manifest={reviewManifest}
          />
        )}
      </main>
    </div>
  );
}
```

### Example 2: Multi-Manifest App

```tsx
// App.tsx
import { useState } from "react";
import { NostrPostComposer, useNostrAuth } from "@nostr-post/react";
import type { NostrPostManifest } from "@nostr-post/core/types";

const manifests: Record<string, NostrPostManifest> = {
  simplePost: {
    id: "simple-post-v1",
    version: "1.0.0",
    publishFormats: [
      { id: "default", label: "Default", kinds: [1], default: true },
    ],
    fields: [
      {
        id: "content",
        type: "string",
        uiPlugin: "textarea",
        mapTo: { kind: 1, target: "content" },
        required: true,
      },
    ],
  },
  article: {
    id: "article-v1",
    version: "1.0.0",
    publishFormats: [
      { id: "default", label: "Default", kinds: [30023], default: true },
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
    ],
  },
};

export function App() {
  const { pubkey, login } = useNostrAuth();
  const [selectedManifest, setSelectedManifest] = useState("simplePost");

  if (!pubkey) {
    return <button onClick={login}>Login</button>;
  }

  return (
    <div>
      <select
        value={selectedManifest}
        onChange={(e) => setSelectedManifest(e.target.value)}
      >
        <option value="simplePost">Simple Post</option>
        <option value="article">Article</option>
      </select>

      <NostrPostComposer
        pubkey={pubkey}
        manifest={manifests[selectedManifest]}
      />
    </div>
  );
}
```

---

## Utility Functions Examples

// 3. Coordinate events
const result = coordinateEvents(restaurantReviewManifest, formData, {
pubkey: "YOUR_PUBLIC_KEY_HERE",
createdAt: Math.floor(Date.now() / 1000),
});

if (!result.success) {
console.error("Validation errors:", result.error);
process.exit(1);
}

// 4. Get the event bundle
const { events } = result.data;

console.log("Generated Events:");
console.log(JSON.stringify(events, null, 2));

// Events[0] - Kind 1 (Social note)
// {
// "kind": 1,
// "created_at": 1703865600,
// "tags": [["r", "5"]],
// "content": "# Amazing Pizza!\n\nBest pizza in town. The crust was perfect!",
// "pubkey": "YOUR_PUBLIC_KEY_HERE"
// }

// Events[1] - Kind 30078 (Structured data)
// {
// "kind": 30078,
// "created_at": 1703865600,
// "tags": [],
// "content": "{\"venue\":{\"name\":\"Mario's Pizzeria\",\"address\":\"123 Main St, New York, NY\",\"location\":{\"lat\":40.7128,\"lon\":-74.006},\"cuisine\":\"Italian\"}}",
// "pubkey": "YOUR_PUBLIC_KEY_HERE"
// }

// 5. Sign and publish (using your preferred Nostr library)
// const signedEvents = await signEvents(events, privateKey);
// await publishEvents(signedEvents, relays);

````

## Example 2: Simple Article

A simpler example using just Kind 30023 (long-form content).

### Manifest

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

export const articleManifest: NostrPostManifest = {
  id: "article-v1",
  version: "1.0.0",
  publishFormats: [
    { id: "default", label: "Default", kinds: [30023], default: true },
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
      id: "summary",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 30023, target: "tag", tagName: "summary" },
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
  ],
  metadata: {
    name: "Article",
    description: "Long-form content using NIP-23",
    author: "nostr-post",
    tags: ["article", "blog", "writing"],
  },
};
````

### Usage

```typescript
import { coordinateEvents } from "@nostr-post/core/coordinator";
import { articleManifest } from "./article-manifest";

const formData = {
  title: "My First Nostr Article",
  summary: "An introduction to structured content on Nostr",
  content: "# Introduction\n\nThis is my first article using nostr-post...",
  coverImage: "https://example.com/cover.jpg",
};

const result = coordinateEvents(articleManifest, formData);

if (result.success) {
  console.log("Article event:", result.data.events[0]);
}
```

## Example 3: Venue/Location

A manifest for storing venue information (restaurants, cafes, etc.).

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

export const venueManifest: NostrPostManifest = {
  id: "venue-v1",
  version: "1.0.0",
  publishFormats: [
    { id: "default", label: "Default", kinds: [30078], default: true },
  ],
  fields: [
    {
      id: "name",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "name" },
      required: true,
    },
    {
      id: "description",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 30078, target: "content", path: "description" },
    },
    {
      id: "category",
      type: "enum",
      uiPlugin: "select",
      mapTo: { kind: 30078, target: "content", path: "category" },
      options: ["Restaurant", "Cafe", "Bar", "Shop", "Park", "Museum", "Other"],
      required: true,
    },
    {
      id: "address",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "address.street" },
    },
    {
      id: "city",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "address.city" },
    },
    {
      id: "country",
      type: "string",
      uiPlugin: "text",
      mapTo: { kind: 30078, target: "content", path: "address.country" },
    },
    {
      id: "location",
      type: "geo",
      uiPlugin: "map",
      mapTo: { kind: 30078, target: "content", path: "coordinates" },
      required: true,
    },
    {
      id: "website",
      type: "string",
      uiPlugin: "url",
      mapTo: { kind: 30078, target: "content", path: "website" },
    },
    {
      id: "phone",
      type: "string",
      uiPlugin: "tel",
      mapTo: { kind: 30078, target: "content", path: "contact.phone" },
    },
  ],
  metadata: {
    name: "Venue",
    description: "Structured venue/location data",
    author: "nostr-post",
    tags: ["venue", "location", "poi"],
  },
};
```

## Utility Functions Examples

### Helper: Validate Manifest

```typescript
import { validateManifest } from "@nostr-post/core/manifest";

const validation = validateManifest(myManifest);

if (!validation.success) {
  console.error("Validation errors:", validation.error);
  // Handle validation failure
} else {
  console.log("Manifest is valid!");
}
```

### Helper: Get Required Fields

```typescript
import { getRequiredFields } from "@nostr-post/core/manifest";

const requiredFields = getRequiredFields(restaurantReviewManifest);
console.log(
  "Required fields:",
  requiredFields.map((f) => f.id),
);
// Output: ['reviewText', 'rating', 'venueName']
```

### Helper: Get Fields by Kind

```typescript
import { getFieldsByKind } from "@nostr-post/core/manifest";

const kind1Fields = getFieldsByKind(restaurantReviewManifest, 1);
console.log(
  "Kind 1 fields:",
  kind1Fields.map((f) => f.id),
);
// Output: ['reviewText', 'rating']

const kind30078Fields = getFieldsByKind(restaurantReviewManifest, 30078);
console.log(
  "Kind 30078 fields:",
  kind30078Fields.map((f) => f.id),
);
// Output: ['venueName', 'venueAddress', 'location', 'cuisine']
```

### Helper: Working with NIP-78 Paths

```typescript
import { setNip78Value, getNip78Value } from "@nostr-post/core/nip78";

// Set a nested value
const data = {};
setNip78Value(data, "venue.name", "Mario's Pizzeria");
setNip78Value(data, "venue.location.lat", 40.7128);

console.log(data);
// { venue: { name: "Mario's Pizzeria", location: { lat: 40.7128 } } }

// Get a nested value
const venueName = getNip78Value(data, "venue.name");
console.log(venueName); // "Mario's Pizzeria"
```

---

## Working Examples in the Repository

### Basic Web Components Example

Location: `examples/basic/`

Features:

- Vanilla Web Components with nostr-login
- Composer with live preview
- Feed with search and filtering
- Manifest creator tool

Run it:

```bash
cd examples/basic
pnpm install
pnpm dev
```

### React Example

Location: `examples/react-demo/`

Features:

- React with Vite
- useNostrAuth hook
- NostrPostComposer and NostrPostFeed components
- Responsive design

Run it:

```bash
cd examples/react-demo
pnpm install
pnpm dev
```

### Next.js Example

Location: `examples/nextjs-demo/`

Features:

- Next.js 14 with App Router
- Server and client components
- Tailwind CSS styling
- Full authentication flow

Run it:

```bash
cd examples/nextjs-demo
pnpm install
pnpm dev
```

---

## Advanced Patterns

### Pattern 1: Multi-Step Form

```tsx
import { useState } from "react";
import { coordinateEvents } from "@nostr-post/core/coordinator";
import { useNostrSigner } from "@nostr-post/react";

function MultiStepForm({ pubkey }: { pubkey: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const { signEvent, publishEvent } = useNostrSigner();

  const handleComplete = async () => {
    const result = coordinateEvents(manifest, formData, { pubkey });
    if (result.success) {
      const signedEvent = await signEvent(result.data.events[0]);
      await publishEvent(signedEvent);
    }
  };

  return (
    <div>
      {step === 1 && (
        <Step1
          data={formData}
          onChange={setFormData}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2
          data={formData}
          onChange={setFormData}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && <Step3 data={formData} onSubmit={handleComplete} />}
    </div>
  );
}
```

### Pattern 2: Draft Saving

```tsx
import { useState, useEffect } from "react";
import { NostrPostComposer } from "@nostr-post/react";

function DraftComposer({ pubkey }: { pubkey: string }) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  // Load draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("nostr-draft");
    if (saved) {
      setDraft(JSON.parse(saved));
    }
  }, []);

  // Save draft periodically
  const handleChange = (data: Record<string, unknown>) => {
    setDraft(data);
    localStorage.setItem("nostr-draft", JSON.stringify(data));
  };

  const handlePublish = () => {
    localStorage.removeItem("nostr-draft");
  };

  return (
    <NostrPostComposer
      pubkey={pubkey}
      initialData={draft}
      onChange={handleChange}
      onPublish={handlePublish}
    />
  );
}
```

### Pattern 3: Event Validation Before Publishing

```tsx
import { coordinateEvents, validateManifest } from "@nostr-post/core";

async function publishWithValidation(manifest, formData, pubkey) {
  // 1. Validate manifest
  const manifestCheck = validateManifest(manifest);
  if (!manifestCheck.success) {
    throw new Error(`Invalid manifest: ${manifestCheck.error}`);
  }

  // 2. Coordinate events
  const result = coordinateEvents(manifest, formData, { pubkey });
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error}`);
  }

  // 3. Additional custom validation
  const { events } = result.data;
  for (const event of events) {
    if (event.content.length > 10000) {
      throw new Error("Content too long");
    }
  }

  // 4. Sign and publish
  // ... your signing/publishing logic

  return events;
}
```

---

## Next Steps

- 📖 See [QUICKSTART.md](./QUICKSTART.md) for installation guides
- 🏗️ Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the design
- 🔌 Learn about [PLUGINS.md](./PLUGINS.md) for creating custom plugins
- 💻 Explore the [examples/](./examples) folder for complete working code

## Need Help?

- 🐛 [Report bugs](https://github.com/saintego/nostr-post/issues)
- 💬 [Discussions](https://github.com/saintego/nostr-post/discussions)
- 📚 [Full documentation](./README.md)
