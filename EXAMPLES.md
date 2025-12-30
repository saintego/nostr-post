# nostr-post Examples

This directory contains example manifests and usage patterns for nostr-post.

## Example 1: Restaurant Review

A complete example showing how to create a restaurant review that splits data across Kind 1 (social) and Kind 30078 (structured data).

### Manifest

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

export const restaurantReviewManifest: NostrPostManifest = {
  id: "restaurant-review-v1",
  version: "1.0.0",
  requiredKinds: [1, 30078],
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
  metadata: {
    name: "Restaurant Review",
    description: "A structured review system for restaurants on Nostr",
    author: "nostr-post",
    tags: ["review", "restaurant", "food"],
  },
};
```

### Usage

```typescript
import { coordinateEvents } from "@nostr-post/core/coordinator";
import { validateManifest } from "@nostr-post/core/manifest";
import { restaurantReviewManifest } from "./restaurant-review-manifest";

// 1. Validate the manifest
const manifestValidation = validateManifest(restaurantReviewManifest);
if (!manifestValidation.success) {
  console.error("Invalid manifest:", manifestValidation.error);
  process.exit(1);
}

// 2. Prepare form data
const formData = {
  reviewText: "# Amazing Pizza!\n\nBest pizza in town. The crust was perfect!",
  rating: 5,
  venueName: "Mario's Pizzeria",
  venueAddress: "123 Main St, New York, NY",
  location: { lat: 40.7128, lon: -74.006 },
  cuisine: "Italian",
};

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
//   "kind": 1,
//   "created_at": 1703865600,
//   "tags": [["r", "5"]],
//   "content": "# Amazing Pizza!\n\nBest pizza in town. The crust was perfect!",
//   "pubkey": "YOUR_PUBLIC_KEY_HERE"
// }

// Events[1] - Kind 30078 (Structured data)
// {
//   "kind": 30078,
//   "created_at": 1703865600,
//   "tags": [],
//   "content": "{\"venue\":{\"name\":\"Mario's Pizzeria\",\"address\":\"123 Main St, New York, NY\",\"location\":{\"lat\":40.7128,\"lon\":-74.006},\"cuisine\":\"Italian\"}}",
//   "pubkey": "YOUR_PUBLIC_KEY_HERE"
// }

// 5. Sign and publish (using your preferred Nostr library)
// const signedEvents = await signEvents(events, privateKey);
// await publishEvents(signedEvents, relays);
```

## Example 2: Simple Article

A simpler example using just Kind 30023 (long-form content).

### Manifest

```typescript
import type { NostrPostManifest } from "@nostr-post/core/types";

export const articleManifest: NostrPostManifest = {
  id: "article-v1",
  version: "1.0.0",
  requiredKinds: [30023],
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
```

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
  requiredKinds: [30078],
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

## Utility Functions

### Helper: Get Required Fields

```typescript
import { getRequiredFields } from "@nostr-post/core/manifest";

const requiredFields = getRequiredFields(restaurantReviewManifest);
console.log(
  "Required fields:",
  requiredFields.map((f) => f.id)
);
// Output: ['reviewText', 'rating', 'venueName']
```

### Helper: Get Fields by Kind

```typescript
import { getFieldsByKind } from "@nostr-post/core/manifest";

const kind1Fields = getFieldsByKind(restaurantReviewManifest, 1);
console.log(
  "Kind 1 fields:",
  kind1Fields.map((f) => f.id)
);
// Output: ['reviewText', 'rating']
```

### Helper: Validate Individual Field

```typescript
import { validatePostField } from "@nostr-post/core/manifest";

const field = {
  id: "rating",
  type: "number",
  uiPlugin: "stars",
  mapTo: { kind: 1, target: "tag", tagName: "r" },
  required: true,
};

const validation = validatePostField(field);
if (validation.success) {
  console.log("Field is valid!");
}
```

## Next Steps

1. **Sign Events:** Use a Nostr signing library like `nostr-tools` to sign the unsigned events
2. **Publish Events:** Connect to Nostr relays and publish the signed events
3. **Build UI:** Create Web Components or React components that use these manifests

For more examples, see the [Development Guide](../DEVELOPMENT_GUIDE.md).
