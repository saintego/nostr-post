# @nostr-post/list

Bookmark lists ([NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md)) for `@nostr-post`:
save wiki entities (a venue, a beer), posts and other events to the user's lists, like saved places
in a map app ("Want to go", "Favourite pubs").

The package has two entry points:

- [`@nostr-post/list`](#nostr-postlist-the-logic): the logic, with no UI and no Lit:
  reading and editing lists, the `list` field plugin, and helpers for building your own UI (React,
  another framework, or none);
- [`@nostr-post/list/web`](#nostr-postlistweb-the-web-components): the Lit web
  components (`<np-list-save>`, `<np-list-view>` and the list field's input), built on the logic.

Using only the logic, you never import `/web`. (Lit is still installed with the package as a
dependency; making it optional is on the [roadmap](../../ROADMAP.md).)

## What it does

- **Lists**: the user's bookmarks list (kind 10003, the one other clients show as "Bookmarks") and
  bookmark sets (kind 30003, named, as many as they like)
- **Items**: `a` tags (addressable events, e.g. a wiki entity `30818:<pubkey>:<d-tag>`) and `e` tags
  (event ids)
- **Wiki entities** are one item whichever author's version was saved: the list stores the address of
  the version the user saw (like reviews cite entities) and shows the entity by its d-tag, so it shows
  the current page, and saving another version of it doesn't add it twice
- **Manifest lists**: a manifest names the lists for events made with it (`lists`, e.g. "Want to go"
  and "Visited" for venues, "Saved reviews" for reviews, see [MANIFEST.md](../../MANIFEST.md#lists)).
  They come first, also before the user has them (saving to one creates it), and only such events get
  a Save button. Their d-tag is `nostr-post:<listType>:<id>` (`nostr-post:venue:visited`; `listType`
  defaults to the manifest id), or the list's own `dTag`
- **Lists created by name** get the d-tag `nostr-post:<slug of the name>` (`nostr-post:liked`): the
  same name is the same list everywhere, and creating it again adds to it. Lists shown together with
  the same title get their type ("Liked (beer)")
- **Edits** start from the newest copy of the list on relays, so a change made on another device isn't
  undone. Tags other clients wrote and the content (where NIP-51 keeps encrypted private items) are kept
- **Deleting** a set publishes a deletion request (NIP-09, kind 5); deleted sets aren't listed. The
  bookmarks list can't be deleted, only emptied
- **Publishing** goes through `@nostr-post/signer` (`signAndPublish`) to the user's relays (signer and
  NIP-65) plus `relays`, so test mode (dry run) applies

Private (encrypted) items aren't read or written yet.

## Installation

```bash
pnpm add @nostr-post/list
```

## `@nostr-post/list`: the logic

Importing it registers the `list` field plugin (without an input: the web entry adds that, or you
register your own, see [your own UI](#building-your-own-ui)).

### Reading and editing lists

```typescript
import { addToList, createList, fetchMyLists, itemFor } from "@nostr-post/list";

const item = itemFor("30818:<pubkey>:tap-house-venue");
const [bookmarks, ...sets] = await fetchMyLists();

const saved = await addToList(bookmarks, item);
if (!saved.success) console.error(saved.error.message);

await createList({ title: "Want to go", items: [item] });
```

They take `{ relays?, listKind? }` and return a `Result` instead of throwing. `listKind` picks the
kind of list: `BOOKMARK_LISTS` (default: the bookmarks list 10003 and bookmark sets 30003) or
`CALENDAR_LISTS` (NIP-52 calendars, 31924: sets only, no standard list), or your own
`{ set, standard? }`.

- `fetchLists(pubkey, options)`, `fetchMyLists(options)`: the bookmarks list first (empty, `createdAt`
  0, until first used), then sets by title; deleted sets left out
- `addToList(list, item, options)`, `addItemsToList(list, items, options)`,
  `removeFromList(list, item, options)`
- `createList({ title, description?, items? }, options)`: a set with the d-tag `nostr-post:<slug of the
  title>`; when the user has it already, the items are added to it
- `deleteList(list, options)`: sets only (a calendar is a set too)

### The list field

```js
import { listField } from "@nostr-post/list";

listField({ saveField: "venue", label: "Save the venue to lists" });
// {
//   id: "venue_lists", type: "string", uiPlugin: "list",
//   mapTo: { kind: 1, target: "tag", tagName: "lists" }, // nothing is added to the post
//   metadata: { label: "Save the venue to lists", saveField: "venue" },
// }
```

The field's value is a string array: list addresses, and `new:<title>` for lists to create
(`listChoices(value)` reads it, `choiceValue(choice)` writes one). Nothing is published while the author
picks: once the post is published, the plugin's `afterPublish` hook saves to the chosen lists the wiki
entity of `saveField` (the venue's page, which the venue field may just have created), or without
`saveField` the post itself. A list it can't save to is reported by the composer; the post stays
published.

- `listField(options)`, `listFieldPlugin`, `listChoices(value)`, `choiceValue(choice)`
- `fieldPresets(field, manifest)`: the lists to offer first, those of the `saveField`'s entity manifest
  (a `venue` field's `wikiEntity`, a `wiki-entity-picker`'s `entityManifest`, resolved through
  `@nostr-post/plugins/entities` once `@nostr-post/wiki` is loaded), else the post manifest's own
- `itemsToSave(field, { formData, events })`, `saveToChoices(choices, items, options)`: what the hook
  saves, and saving it

### Building your own UI

The web components use these, and so can any UI:

```typescript
import { pluginRegistry } from "@nostr-post/plugins/registry";
import {
  fieldPresets,
  listFieldPlugin,
  listTitles,
  loadMyLists,
  NOT_LOADED,
  shownLists,
} from "@nostr-post/list";

// Your input for the list field (the composer then doesn't load the web entry)
pluginRegistry.register({ ...listFieldPlugin, inputTagName: "my-list-input" });

// In your input: the user's lists, step by step
let state = NOT_LOADED;
const presets = await fieldPresets(field, manifest);
await loadMyLists(relays, messages, (patch) => {
  state = { ...state, ...patch };
  const lists = shownLists(state, presets); // the manifest's lists first
  const titles = listTitles(lists, messages); // "Liked (beer)" where titles repeat
  render(state, lists, titles);
}, composerPubkey);
```

- `loadMyLists(relays, messages, update, knownPubkey?)`: reports `{ waitingForSigner }`, then
  `{ pubkey }`, then `{ lists }`, or `{ error }` (the signer didn't answer within `SIGNER_TIMEOUT_MS`,
  20 s, or failed). A signer answering after the timeout (e.g. once the user signed in) still
  loads: `{ pubkey, error: '' }`, then `{ lists }`, and the promise resolves only then. With
  `knownPubkey` (e.g. the composer's) the signer isn't asked. `messages`:
  `noSigner`, `signerNoAnswer`, `failed(reason)` (`MyListsMessages`)
- `shownLists(state, presets)`: the lists to offer, presets first (also while the user's lists load)
- `listTitle(list, names)`, `listTitles(lists, names)`: what lists are called; `names`: `bookmarks`,
  `untitled`, `titleWithType(title, type)` (`ListTitleNames`)
- `manifestListPresets(manifest)`: a manifest's lists with their d-tags
- `listWithTitle(lists, title, titleOf?)`: an existing list with that name, to reuse it

### Helpers

Pure functions (`core.ts`): `parseList`, `currentLists`, `withBookmarks`, `withPresets`, `withItem`,
`withoutItem`, `sameItem`, `hasItem`, `itemFor`, `itemForEvent`, `entityItems`, `listAddress`,
`listAtAddress`, `listPresets(lists, type)`, `listTypeOf(list)`, `newSetEvent`, `newSetDTag`,
`newBookmarksEvent`, `deletionEvent`. Item titles (`itemTitles.ts`): `fetchItemTitles`, `itemFilters`,
`eventForItem`, `eventTitle`.

### Types

```typescript
interface ListItem {
  tag: "a" | "e";
  value: string; // address or event id
  relay?: string;
}

interface BookmarkList {
  address: string; // "10003:<pubkey>:", "30003:<pubkey>:<d-tag>" or "31924:<pubkey>:<d-tag>"
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

## `@nostr-post/list/web`: the web components

```html
<script type="module">
  import "@nostr-post/list/web";
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

Importing it also:

- gives the `list` field its input, `<np-list-input>`;
- adds `<np-list-save>` to events made with manifests that have `lists` (`registerEventAction` of
  `@nostr-post/plugins/entities`): `<nostr-post-view>` shows it in the header, `<nostr-wiki-view>` next
  to the title, `<np-venue-view>` next to the venue's name.

`<np-list-save>` and `<np-list-input>` show what they wait for: the signer (a remote signer or a
permission prompt; after 20 s "Your signer didn't answer" with "Try again", replaced by the lists
if the signer still answers), then the relays (the manifest's lists show meanwhile). A signer that
answers without a pubkey (nobody signed in) is an error with "Try again", not an empty list; the
signer package forgets the pubkey when nostr-login reports a sign-in or sign-out (`nlAuth`).

### `<np-list-save>`

| Property / attribute | Type                    | Description                                                     |
| -------------------- | ----------------------- | --------------------------------------------------------------- |
| `target`             | `string`                | What to save: an `a` address or an event id                     |
| `relay`              | `string`                | Relay hint saved with the item                                  |
| `relays`             | `string[]`              | Relays besides the user's own (default `DEFAULT_RELAYS`)        |
| `manifest`           | `NostrPostManifest`     | The manifest the target was made with: its `lists` come first   |
| `messages`           | `Partial<ListMessages>` | Overrides for the user-facing text (`DEFAULT_LIST_MESSAGES`)    |
| `listKind`           | `ListKind`              | Which lists (default `BOOKMARK_LISTS`); `@nostr-post/plugin-date`'s `<np-calendar-save>` is this with `CALENDAR_LISTS` |

In a view's header (class `view-action`) the panel opens leftwards, since the button sits at the
right edge. Lists load when it's first opened, since feeds show many. Typing the name of a list the user has
saves to that list. Fires `np-list-change` (`{ list }`) after a list was published.

### `<np-list-view>`

| Property / attribute | Type                    | Description                                                    |
| -------------------- | ----------------------- | -------------------------------------------------------------- |
| `address`            | `string`                | The list to show; empty: the signed-in user's lists            |
| `relays`             | `string[]`              | Relays besides the list owner's own                            |
| `messages`           | `Partial<ListMessages>` | Overrides for the user-facing text                             |

Registered as the kind view of lists (10003, 30003): a post linking a list (`nostr:naddr…`) shows it.
Items show the title of their event (a wiki entity's newest version, by d-tag). The owner can remove
items and delete sets. Fires `np-list-item-select` (`{ item, list, title }`) when an item is clicked
and `np-list-change` (`{ list, deleted? }`) after a change.

### `<np-list-input>`

The list field's input; composers set its properties (the [input contract](../../PLUGINS.md)):
`value`, `field`, `manifest` (to find the `saveField`'s entity manifest) and `pubkey` (the composer's;
then the signer isn't asked). It lists the user's lists with the [field's presets](#the-list-field)
first, takes new lists by name (an existing name ticks that list) and explains itself
(`messages.fieldHint`), so the field needs only a label.

### Messages

All components take `messages` (`Partial<ListMessages>`; English defaults in `DEFAULT_LIST_MESSAGES`),
e.g. for translations. They include the words of the logic's helpers (`ListTitleNames`,
`MyListsMessages`), so one object serves both.

## License

MIT
