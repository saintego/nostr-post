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

- **Manifest driven**: a manifest names the lists for events made with it (`lists`, e.g. "Want to
  go" and "Visited" for venues, "Saved reviews" for reviews, see [MANIFEST.md](../../MANIFEST.md#lists)).
  They are offered first, also before the user has them (ticking one creates it), and only such events
  get a Save button. A post manifest saves its venue or picked entity, or the post itself, with a
  `list` field once the post is published; with a publish format of `kinds: []` a manifest only saves
  (find a place, save it)

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

Importing `@nostr-post/plugin-list/web` also registers the `list` field plugin (input
`<np-list-input>`) and adds `<np-list-save>` to events made with manifests that have `lists`
(`registerEventAction` of `@nostr-post/plugins/entities`): `<nostr-post-view>` shows it in the header,
`<nostr-wiki-view>` next to the title, `<np-venue-view>` next to the venue's name. The package doesn't
depend on `@nostr-post/wiki`: the entity manifests the list field needs are resolved through
`@nostr-post/plugins/entities`, which the wiki package provides once loaded.

A manifest's list has the d-tag `nostr-post:<listType>:<id>` (`nostr-post:venue:visited`; `listType`
defaults to the manifest id), or its own `dTag` ([MANIFEST.md](../../MANIFEST.md#lists)). Both
components show what they wait for: the signer (a remote signer or a permission prompt; after 20 s
"Your signer didn't answer" with "Try again"), then the relays (the manifest's lists show meanwhile).
`<np-list-input>` takes the composer's `pubkey` when it has one, and doesn't ask the signer then.

## The list field

```js
import { listField } from "@nostr-post/plugin-list";

listField({ saveField: "venue", label: "Save the venue to lists" });
// {
//   id: "venue_lists", type: "string", uiPlugin: "list",
//   mapTo: { kind: 1, target: "tag", tagName: "lists" }, // nothing is added to the post
//   metadata: { label: "Save the venue to lists", saveField: "venue" },
// }
```

The input explains itself (`messages.fieldHint`), so the field needs only a label.

`<np-list-input>` lists the signed-in user's lists, the `lists` of the `saveField`'s entity manifest
first (a `venue` field's `wikiEntity`, a `wiki-entity-picker`'s `entityManifest`), or without
`saveField` the post manifest's own, and takes new lists by title. It publishes nothing: the value is a
string array of list addresses and `new:<title>` for lists to create (`listChoices(value)` reads it). Once the post is published, the field's `afterPublish` hook saves the
entity (the venue's page the venue field may just have created) to them; without `saveField` it saves
the post itself. A list it can't save to is reported by the composer; the post stays published.

### `<np-list-save>`

| Property / attribute | Type                    | Description                                                     |
| -------------------- | ----------------------- | --------------------------------------------------------------- |
| `target`             | `string`                | What to save: an `a` address or an event id                     |
| `relay`              | `string`                | Relay hint saved with the item                                  |
| `relays`             | `string[]`              | Relays besides the user's own (default `DEFAULT_RELAYS`)        |
| `manifest`           | `NostrPostManifest`     | The manifest the target was made with: its `lists` come first   |
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
- `createList({ title, description?, items? }, options)`: a set with the d-tag `nostr-post:<slug of the
  title>` (`nostr-post:liked`); when the user has it already, the items are added to it
- `deleteList(list, options)`: sets only
- `addItemsToList(list, items, options)`: several items in one event

The list field (`listField.ts`): `listField(options)`, `listFieldPlugin`, `listChoices(value)`,
`choiceValue(choice)`, `fieldPresets(field, manifest)`, `itemsToSave(field, { formData,
events })` and `saveToChoices(choices, items, options)`.

Pure helpers (`core.ts`): `parseList`, `currentLists`, `withBookmarks`, `withPresets`, `withItem`,
`withoutItem`, `sameItem`, `hasItem`, `itemFor`, `itemForEvent`, `entityItems`, `listAddress`,
`listAtAddress`, `listPresets(lists, type)`, `manifestListPresets(manifest)`, `newSetEvent`,
`newSetDTag`, `newBookmarksEvent`, `deletionEvent`. Item titles (`itemTitles.ts`): `fetchItemTitles`, `itemFilters`, `eventForItem`,
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
