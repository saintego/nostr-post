# @nostr-post/plugin-list

Bookmark lists ([NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md)) for `@nostr-post`:
save wiki entities (a venue, a beer) and other events to the user's lists, like saved places in a
map app ("Want to go", "Favourite pubs").

- **Lists**: the user's bookmarks list (kind 10003, the one other clients show as "Bookmarks") and
  bookmark sets (kind 30003, named, as many as they like)
- **Items**: `a` tags (addressable events, e.g. a wiki entity `30818:<pubkey>:<d-tag>`) and `e` tags
  (event ids)
- **Wiki entities** are one item whichever author's version was saved: the list stores the address of
  the version the user saw (like reviews cite entities) and shows the entity by its d-tag, so it shows
  the current page, and saving another version of it doesn't add it twice
- **Edits** start from the newest copy of the list on relays, so a change made on another device isn't
  undone. Tags other clients wrote and the content (where NIP-51 keeps encrypted private items) are kept
- **Deleting** a set publishes a deletion request (NIP-09, kind 5); deleted sets aren't listed. The
  bookmarks list can't be deleted, only emptied
- **Publishing** goes through `@nostr-post/signer` (`signAndPublish`) to the user's relays (signer and
  NIP-65) plus `relays`, so test mode (dry run) applies

Private (encrypted) items aren't read or written yet.

## Installation

```bash
pnpm add @nostr-post/plugin-list
```

## Web components

```html
<script type="module">
  import "@nostr-post/plugin-list/web";
</script>

<!-- A Save button: opens the user's lists to add it to or remove it from, or start a new list -->
<np-list-save target="30818:<pubkey>:tap-house-venue"></np-list-save>

<!-- The signed-in user's lists; or one list with address="30003:<pubkey>:<d-tag>" -->
<np-list-view id="lists"></np-list-view>

<script type="module">
  document.getElementById("lists").addEventListener("np-list-item-select", (e) => {
    const { item, list, title } = e.detail; // item: { tag: "a", value: "30818:…" }
    // open the entity, e.g. <nostr-wiki-view entity-id="tap-house-venue">
  });
</script>
```

`<np-venue-view>` (`@nostr-post/plugin-venue`) shows `<np-list-save>` next to a venue that has a wiki
page.

### `<np-list-save>`

| Property / attribute | Type                    | Description                                                     |
| -------------------- | ----------------------- | --------------------------------------------------------------- |
| `target`             | `string`                | What to save: an `a` address or an event id                     |
| `relay`              | `string`                | Relay hint saved with the item                                  |
| `relays`             | `string[]`              | Relays besides the user's own (default `DEFAULT_RELAYS`)        |
| `messages`           | `Partial<ListMessages>` | Overrides for the user-facing text (`DEFAULT_LIST_MESSAGES`)    |

Lists load when it's first opened, since feeds show many. Fires `np-list-change`
(`{ list }`) after a list was published.

### `<np-list-view>`

| Property / attribute | Type                    | Description                                                    |
| -------------------- | ----------------------- | -------------------------------------------------------------- |
| `address`            | `string`                | The list to show; empty: the signed-in user's lists            |
| `relays`             | `string[]`              | Relays besides the list owner's own                            |
| `messages`           | `Partial<ListMessages>` | Overrides for the user-facing text                             |

Items show the title of their event (a wiki entity's newest version, by d-tag). The owner can remove
items and delete sets. Fires `np-list-item-select` (`{ item, list, title }`) when an item is clicked
and `np-list-change` (`{ list, deleted? }`) after a change.

## Functions

```typescript
import { addToList, createList, fetchMyLists, itemFor } from "@nostr-post/plugin-list";

const item = itemFor("30818:<pubkey>:tap-house-venue");
const [bookmarks, ...sets] = await fetchMyLists();

const saved = await addToList(bookmarks, item);
if (!saved.success) console.error(saved.error.message);

await createList({ title: "Want to go", items: [item] });
```

Reading and publishing (`lists.ts`; they take `{ relays? }` and return a `Result` instead of throwing):

- `fetchLists(pubkey, options)`, `fetchMyLists(options)`: the bookmarks list first (empty, `createdAt`
  0, until first used), then sets by title; deleted sets left out
- `addToList(list, item, options)`, `removeFromList(list, item, options)`
- `createList({ title, description?, items? }, options)`: a new set with a d-tag from the title
- `deleteList(list, options)`: sets only

Pure helpers (`core.ts`): `parseList`, `currentLists`, `withBookmarks`, `withItem`, `withoutItem`,
`sameItem`, `hasItem`, `itemFor`, `listAddress`, `newSetEvent`, `newSetDTag`, `newBookmarksEvent`,
`deletionEvent`. Item titles (`itemTitles.ts`): `fetchItemTitles`, `itemFilters`, `eventForItem`,
`eventTitle`.

### Types

```typescript
interface ListItem {
  tag: "a" | "e";
  value: string; // address or event id
  relay?: string;
}

interface BookmarkList {
  address: string; // "10003:<pubkey>:" or "30003:<pubkey>:<d-tag>"
  kind: number;
  pubkey: string;
  dTag: string;
  title?: string;
  description?: string;
  items: ListItem[];
  createdAt: number;
  event: ListEvent; // what edits start from
}
```

## License

MIT
