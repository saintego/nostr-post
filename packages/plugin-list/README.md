# @nostr-post/plugin-list

NIP-51 user lists plugin for `@nostr-post`. Enables managing curated lists of Nostr users for audience control, trust networks, and access management.

## Features

- **Fetch user lists** (NIP-51, kind 30000-30099)
- **Create new lists** inline with optional description
- **Delete lists** with confirmation
- **Select lists** for audience targeting
- **Add pubkeys** to track specific users
- **Type-safe** plugin integration

## Installation

```bash
pnpm add @nostr-post/plugin-list
```

## Basic Usage

### Web Component

```html
<script type="module">
  import '@nostr-post/plugin-list/web';
</script>

<np-list-input id="list-select"></np-list-input>

<script>
  const input = document.getElementById('list-select');
  input.addEventListener('np-value-changed', (e) => {
    console.log('Selected list:', e.detail.value);
    // { listIds: ["30000:pubkey:list-name"], pubkeys?: [...] }
  });
</script>
```

### Manifest Integration

```typescript
import type { NostrPostManifest } from '@nostr-post/core/types';

const venueReviewManifest: NostrPostManifest = {
  id: 'venue-review-v1',
  version: '1.0.0',
  publishFormats: [{ id: 'article', label: 'Article', kinds: [30023], default: true }],
  fields: [
    {
      id: 'review',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 30023, target: 'content' },
      required: true,
    },
    {
      id: 'audience',
      type: 'string',
      uiPlugin: 'list',
      mapTo: { kind: 30023, target: 'tag', tagName: 'L' },
      metadata: {
        allowCreate: true,
        allowDelete: true,
        defaultList: 'trusted-reviewers',
        multiple: true,
      },
    },
  ],
};
```

### React Component

```tsx
import { NostrPostComposer } from '@nostr-post/react';
import '@nostr-post/plugin-list/web';

export function ReviewForm() {
  return (
    <NostrPostComposer
      manifest={venueReviewManifest}
      prefill={{
        audience: {
          listIds: ['my-trusted-reviewers', 'venue-mods'],
        },
      }}
    />
  );
}
```

## Types

### `UserList`

```typescript
interface UserList {
  name: string;
  description?: string;
  pubkeys: string[];
  createdAt?: number;
  id?: string;
}
```

### `ListSelectionData`

Value type used for list selection fields.

```typescript
interface ListSelectionData {
  listIds: string[];
  listId?: string;
  pubkeys?: string[];
}
```

### `ListPluginConfig`

Plugin configuration in field metadata.

```typescript
interface ListPluginConfig {
  relays?: string[];
  allowCreate?: boolean;
  allowDelete?: boolean;
  defaultList?: string;
  multiple?: boolean;
}
```

## Core Functions

### `fetchUserLists(userPubkey, relays)`

Fetches all NIP-51 lists for a user from specified relays.

```typescript
import { fetchUserLists } from '@nostr-post/plugin-list';

const lists = await fetchUserLists(userPubkey, relays);
console.log(lists);
// [
//   { name: 'Trusted Reviewers', pubkeys: [...], ... },
//   { name: 'Moderators', pubkeys: [...], ... }
// ]
```

### `createListEvent(userPubkey, listName, pubkeys, kind, description)`

Creates an unsigned NIP-51 list event. Must be signed and published by caller.

```typescript
import { createListEvent } from '@nostr-post/plugin-list';

const event = createListEvent(
  userPubkey,
  'Trusted Reviewers',
  ['npub1...', 'npub2...'],
  30000,
  'People I trust for venue reviews'
);

// Sign and publish
const signed = await signer.call('sign_event', event);
await relay.publish(signed);
```

### `parseListEvent(event)`

Parses a NIP-51 event into UserList format.

```typescript
import { parseListEvent } from '@nostr-post/plugin-list';

const list = parseListEvent(nostrEvent);
```

## Use Cases

### 1. Verified Reviewer Network

```typescript
const manifest = {
  fields: [
    {
      id: 'audience',
      type: 'string',
      uiPlugin: 'list',
      metadata: {
        defaultList: 'verified-reviewers',
        allowCreate: false,
        allowDelete: false,
      },
    },
  ],
};
```

### 2. Moderation & Curation

```typescript
const manifest = {
  fields: [
    {
      id: 'moderators',
      type: 'string',
      uiPlugin: 'list',
      mapTo: { kind: 30023, target: 'tag', tagName: 'moderator' },
      metadata: {
        allowCreate: true,
        allowDelete: true,
      },
    },
  ],
};
```

### 3. Community Access Control

```typescript
<nostr-post-composer
  manifest={manifest}
  prefill={{
    audience: { listIds: ['community-members'] },
    // or multiple lists:
    // audience: { listIds: ['community-members', 'trusted-reviewers'] },
  }}
/>
```

## NIP-51 Reference

**Kind 30000**: Mute list (users, hashtags, events)
**Kind 30001**: Pinned notes
**Kind 30002**: Relay list
**Kind 30003**: Bookmark list
**Kind 30004**: Communities
**Kind 30005**: Public chats
**Kind 30008**: Relay sets
**Kind 30009**: User groups

See [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) for full specification.

## Related Plugins

- [@nostr-post/plugin-venue](../plugin-venue) - OSM location/venue selection
- [@nostr-post/plugin-geo](../plugin-geo) - Geohash + map
- [@nostr-post/plugin-stars](../plugin-stars) - Star ratings
- [@nostr-post/plugin-markdown](../plugin-markdown) - Rich text editing

## License

MIT
