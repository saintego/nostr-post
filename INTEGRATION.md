# Integration Guide - Using nostr-post in Other Projects

This guide covers how to use nostr-post in your own React/Next.js projects and deploy to Vercel.

## 🚀 Quick Start: Two Paths

### Path 1: Local Development (Before npm Publishing)

Use local workspace references while developing:

```json
{
  "dependencies": {
    "@nostr-post/react": "file:../nostr-post/packages/react",
    "@nostr-post/core": "file:../nostr-post/packages/core",
    "@nostr-post/signer": "file:../nostr-post/packages/signer",
    "@nostr-post/plugin-geo": "file:../nostr-post/packages/plugin-geo",
    "@nostr-post/plugin-venue": "file:../nostr-post/packages/plugin-venue",
    "@nostr-post/plugin-media": "file:../nostr-post/packages/plugin-media",
    "@nostr-post/plugin-markdown": "file:../nostr-post/packages/plugin-markdown",
    "@nostr-post/plugin-hashtag": "file:../nostr-post/packages/plugin-hashtag",
    "@nostr-post/plugin-stars": "file:../nostr-post/packages/plugin-stars"
  }
}
```

**Pros:**

- Immediate access to latest code
- Easy to debug source code
- Changes reflect immediately (with rebuild)

**Cons:**

- Requires local copy of nostr-post
- Path references break in CI/CD

### Path 2: Published on npm (Recommended for Production)

**Publishing Steps:**

```bash
# In nostr-post root
pnpm -r build

# Update version in each package.json
# Example: 0.1.0 → 0.2.0

# Publish to npm
cd packages/core
npm publish

cd ../signer
npm publish

cd ../plugins
npm publish

# Repeat for @nostr-post/web, @nostr-post/react, and all plugins
```

Then in your project:

```json
{
  "dependencies": {
    "@nostr-post/react": "^0.2.0",
    "@nostr-post/core": "^0.2.0",
    "@nostr-post/plugin-venue": "^0.2.0"
  }
}
```

**Pros:**

- Works in CI/CD and Vercel
- Reproducible versions
- Easy for others to use

**Cons:**

- Slower iteration
- Manual version updates

---

## 📱 Example: Venue Reviews App (OSM-Based)

Create a new Next.js app that uses nostr-post for venue reviews:

### Setup

```bash
npx create-next-app@latest venue-reviews --typescript --tailwind
cd venue-reviews

# Add nostr-post packages (choose Path 1 or 2 above)
npm install @nostr-post/react @nostr-post/core @nostr-post/plugin-venue @nostr-post/plugin-media @nostr-post/plugin-markdown @nostr-post/plugin-stars
```

### Manifest Definition

Create `lib/manifests.ts`:

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

export const venueReviewManifest: NostrPostManifest = {
  id: "venue-review-osm-v1",
  version: "1.0.0",
  requiredKinds: [30023], // Long-form for detailed reviews
  fields: [
    {
      id: "venueName",
      type: "string",
      mapTo: { kind: 30023, target: "title" },
      required: true,
      defaultValue: "Venue Review",
      visibility: { edit: "readonly", view: "visible" },
    },
    {
      id: "venue",
      type: "string",
      uiPlugin: "venue", // OSM search + location
      mapTo: { kind: 30023, target: "venue" },
      required: true,
      metadata: { precision: 8 },
    },
    {
      id: "rating",
      type: "number",
      uiPlugin: "stars",
      mapTo: { kind: 30023, target: "rating" },
      required: true,
      defaultValue: 3,
      metadata: { max: 5 },
    },
    {
      id: "reviewText",
      type: "string",
      uiPlugin: "markdown",
      mapTo: { kind: 30023, target: "content" },
      required: true,
      defaultValue: "# venue Review\n\nShare your experience...",
    },
    {
      id: "photos",
      type: "array",
      uiPlugin: "media",
      mapTo: { kind: 30023, target: "image-tags" },
      metadata: { maxFiles: 10 },
    },
    {
      id: "tags",
      type: "array",
      uiPlugin: "hashtag",
      mapTo: { kind: 30023, target: "t-tags" },
      defaultValue: ["osm", "venue-review"],
    },
  ],
};

// Public manifest event (shared definition)
export const manifestInfoEvent = {
  kind: 30078,
  dTag: "venue-review-osm-v1",
  content: JSON.stringify(venueReviewManifest),
};
```

### Create Review Page

Create `app/review/create/page.tsx`:

```tsx
"use client";

import { useNostrAuth } from "@nostr-post/react";
import { NostrPostComposer } from "@nostr-post/react";
import { venueReviewManifest } from "@/lib/manifests";

// CRITICAL: Import plugins to register them
import "@nostr-post/plugin-venue";
import "@nostr-post/plugin-media";
import "@nostr-post/plugin-markdown";
import "@nostr-post/plugin-stars";
import "@nostr-post/plugin-hashtag";

export default function CreateReview() {
  const { pubkey, login, isLoading } = useNostrAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!pubkey) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1>Leave a Venue Review</h1>
        <button
          onClick={login}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Login with Nostr
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1>Review a Venue</h1>

      <NostrPostComposer
        pubkey={pubkey}
        manifest={venueReviewManifest}
        relays={[
          "wss://relay.damus.io",
          "wss://relay.nostr.band",
          "wss://nostr.wine",
        ]}
        manifestRef={{
          kind: 30078,
          dTag: "venue-review-osm-v1",
        }}
        onPublish={(events) => {
          console.log("Review published!", events);
          // Redirect to review
          // window.location.href = `/review/${events[0].id}`;
        }}
        onError={(error) => {
          console.error("Error publishing:", error);
        }}
      />
    </div>
  );
}
```

### View Reviews Page

Create `app/review/[eventId]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { NostrPostView } from "@nostr-post/react";
import { fetchEvents } from "@nostr-post/signer";
import { venueReviewManifest } from "@/lib/manifests";

// Import plugins
import "@nostr-post/plugin-venue";
import "@nostr-post/plugin-media";
import "@nostr-post/plugin-markdown";
import "@nostr-post/plugin-stars";
import "@nostr-post/plugin-hashtag";

interface NostrEvent {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: Array<[string, ...string[]]>;
  content: string;
  sig: string;
}

export default function ReviewPage({
  params,
}: {
  params: { eventId: string };
}) {
  const [event, setEvent] = useState<NostrEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const events = await fetchEvents(
          ["wss://relay.damus.io", "wss://relay.nostr.band"],
          {
            ids: [params.eventId],
            kinds: [30023],
          },
        );

        if (events.length > 0) {
          setEvent(events[0]);
        }
      } catch (error) {
        console.error("Error loading event:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [params.eventId]);

  if (loading) return <div>Loading review...</div>;
  if (!event) return <div>Review not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <NostrPostView
        event={event}
        manifest={venueReviewManifest}
        relays={["wss://relay.damus.io", "wss://relay.nostr.band"]}
      />
    </div>
  );
}
```

### Progressive fetching (streaming)

The signer `fetchEvents` supports progressive delivery so UIs can render results as relays respond.

Signature:

```ts

fetchEvents(filter, relays?, {
  onUpdate?: (events) => void, // progressive updates with deduped array
  relayTimeoutMs?: number,
  waitForAll?: boolean // if true, waits for all relays, else resolves on first
})
```

- `onEvent` — called for each event as it arrives (useful for incremental rendering).
- `relayTimeoutMs` — per-relay timeout in ms (default 10000).

Example:

```ts
// Render incrementally as events arrive, then receive final deduped array
let events: SignedEvent[] = [];
await fetchEvents(filter, relays, {
  onUpdate: (arr) => {
    events = arr;
    // update UI with deduped array
    renderFeed(events);
  },
  relayTimeoutMs: 3000,
  waitForAll: false, // set true to wait for all relays
});
```

### Feed/Discover Page

Create `app/discover/page.tsx`:

```tsx
"use client";

import { NostrPostFeed } from "@nostr-post/react";
import { venueReviewManifest } from "@/lib/manifests";

// Import plugins
import "@nostr-post/plugin-venue";
import "@nostr-post/plugin-media";
import "@nostr-post/plugin-markdown";
import "@nostr-post/plugin-stars";
import "@nostr-post/plugin-hashtag";

export default function DiscoverPage() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1>Venue Reviews</h1>
      <p>Discover reviews from the community</p>

      <NostrPostFeed
        kinds={[30023]} // Long-form content
        limit={50}
        manifest={venueReviewManifest}
      />
    </div>
  );
}
```

---

## 🌐 Vercel Deployment

### Prerequisites

1. **GitHub Repository**
   - Push your venue-reviews app to GitHub
   - Make sure nostr-post is also pushed

2. **Choose Integration Method**

#### Option A: Monorepo (Simpler for Vercel)

Add venue-reviews as a sibling in the nostr-post monorepo:

```
nostr-post/
├── packages/
│   ├── core/
│   ├── react/
│   └── ... (plugins)
├── examples/
│   ├── basic/
│   ├── react-demo/
│   ├── nextjs-demo/
│   └── venue-reviews/        ← Add here
└── tools/
    └── manifest-creator/
```

Then deploy `examples/venue-reviews` on Vercel:

**vercel.json:**

```json
{
  "buildCommand": "cd ../../ && pnpm install && pnpm build",
  "outputDirectory": "../venue-reviews/.next",
  "installCommand": "cd ../../ && pnpm install"
}
```

#### Option B: Separate Monorepo (More Flexible)

Keep as separate repo, use npm dependencies:

**Requirement:** Publish nostr-post to npm first.

Then in your venue-reviews package.json:

```json
{
  "dependencies": {
    "@nostr-post/react": "^0.2.0"
  }
}
```

### Vercel Configuration

**Option A (Monorepo Integration):**

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository (nostr-post root)
3. Set Root Directory: `examples/venue-reviews`
4. Deploy

**Option B (Separate Repo):**

1. Import venue-reviews repository on Vercel
2. Framework: Next.js (auto-detected)
3. Build Settings: (defaults work)
4. Deploy

### Environment Variables

Add to Vercel Project Settings:

```bash
# Optional: Custom relay endpoints
NEXT_PUBLIC_RELAY_URLS=wss://relay.damus.io,wss://relay.nostr.band,wss://nostr.wine

# Optional: Custom manifest server (if using private manifests)
NEXT_PUBLIC_MANIFEST_SERVER=https://your-manifest-server.com
```

### Build Optimization

For smaller builds, in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce bundle size
  swcMinify: true,

  // Optimize images
  images: {
    unoptimized: true, // or set up image optimization service
  },

  // Mark web components as external to avoid duplication
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = {
        ...config.externals,
        lit: "lit",
        "@lit/react": "@lit/react",
      };
    }
    return config;
  },
};

export default nextConfig;
```

### Troubleshooting Vercel Deployment

**Issue: "Module not found: @nostr-post/react"**

Solution: Ensure packages are published to npm, don't use `file:` references in production.

**Issue: "Web Component not found"**

Solution: Import plugins in your layout.tsx:

```tsx
// app/layout.tsx
"use client";

import "@nostr-post/plugin-venue";
import "@nostr-post/plugin-media";
import "@nostr-post/plugin-markdown";
import "@nostr-post/plugin-stars";
import "@nostr-post/plugin-hashtag";
```

**Issue: Long build times**

Solution: Set Next.js ISR (Incremental Static Regeneration) but use client components for Nostr interactions:

```tsx
// Re-validate every 60 seconds
export const revalidate = 60;
```

---

## 🔐 Manifest Strategy: Public vs Private

### Public Manifests (Recommended for Venue Reviews)

**What it means:** Manifest is stored as a Kind 30078 event on Nostr relays

**Advantages:**

- Anyone can discover your app's structure
- Self-documenting protocol
- Easy to build compatible tools
- Users know what data fields are collected

**How to publish:**

```typescript
import { signEvent, publishEvent } from "@nostr-post/signer";

const manifestEvent = {
  kind: 30078,
  created_at: Math.floor(Date.now() / 1000),
  tags: [["d", "venue-review-osm-v1"]],
  content: JSON.stringify(venueReviewManifest),
  pubkey: yourPubkey,
};

const signed = await window.nostr.signEvent(manifestEvent);
await publishEvent(signed, ["wss://relay.damus.io"]);
```

### Private Manifests (For Internal Apps)

**What it means:** Manifest is only on your backend, not published to Nostr

**Advantages:**

- Full control over schema changes
- Can evolve without breaking users
- Privacy-focused

**How to use:**

```typescript
// No manifestRef in composer - manifest stays local only
<NostrPostComposer
  pubkey={pubkey}
  manifest={venueReviewManifest}
  // No manifestRef prop
/>

// Events stored on Nostr, manifest definition stays on your server
```

### Recommended for Venue Reviews

**Use Public Manifests** because:

1. Users should see what data their review contains
2. Others can build competing venues apps (decentralized)
3. Easier community adoption
4. Aligned with Nostr principles

Example public manifest event:

```nostr
kind: 30078
dTag: venue-review-osm-v1
author: your-npub
content: {
  "id": "venue-review-osm-v1",
  "version": "1.0.0",
  "requiredKinds": [30023],
  "fields": [
    { "id": "venue", "uiPlugin": "venue", ... },
    { "id": "rating", "uiPlugin": "stars", ... },
    ...
  ]
}
```

---

## 📋 Feature Checklist for Venue Reviews

- [x] User can select venue from OSM (plugin-venue)
- [x] User can upload photos (plugin-media)
- [x] User can rate with stars (plugin-stars)
- [x] User can write detailed review (plugin-markdown)
- [x] User can add tags/hashtags (plugin-hashtag)
- [x] Manifest published publicly (Kind 30078)
- [x] Reviews stored on Nostr (Kind 30023)
- [x] Photos linked via NIP-98 (nostr.build)
- [x] Geohash with NIP-52 prefix tags (relay filtering)
- [x] OSM venue identity via NIP-73 tags
- [ ] Search/filter reviews by venue
- [ ] Show reviews on map
- [ ] User profile + review history
- [ ] Reputation/trust scoring

---

## 🚀 Deployment Timeline

### Week 1: Local Development

- Set up venue-reviews app locally
- Build out pages (create, view, discover)
- Test with testnet relays

### Week 2: npm Publishing

- Publish all nostr-post packages to npm
- Update venue-reviews dependencies
- Test production imports

### Week 3: Vercel Deployment

- Set up GitHub repo
- Deploy to Vercel
- Configure custom domain
- Set up monitoring

### Week 4: Production Launch

- Publish manifest to mainnet relays
- Announce launch
- Gather community feedback

---

## 💡 Pro Tips

1. **Start with one relay** (relay.damus.io) for testing, expand later
2. **Use testnet** first (set `kind: 4` or use test relays)
3. **Cache manifests** - fetch once, reuse across sessions
4. **Save user drafts** - localStorage prevents data loss
5. **Validate on server** - Never trust client-side validation alone
6. **Monitor relay connectivity** - Handle offline gracefully

---

## 📚 Related Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Setup guides
- [USAGE_GUIDE.md](./USAGE_GUIDE.md) - API reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Design patterns
- [PLUGINS.md](./PLUGINS.md) - Plugin system

For help: Open an issue on GitHub or join Nostr community relays.
