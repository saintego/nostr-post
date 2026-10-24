# @nostr-post/plugin-profile

People field for nostr-post: pick people by searching their profiles or pasting an `npub`, each
with an optional role. Written as `p` tags, `["p", <pubkey>, <relay>, <role>]`, as NIP-52 lists an
event's participants (hosts, speakers). Without roles, plain mentions.

## Main entry (no UI)

```ts
import {
  profilePlugin,
  personFromText,
  peopleFromTags,
  personTag,
  searchProfiles,
  type Person,
} from '@nostr-post/plugin-profile';

const person = personFromText('npub1…'); // { pubkey } or undefined
const found = await searchProfiles('alice'); // [{ pubkey, profile }]
```

A field's value is a list of `Person`: `{ pubkey, role?, relay? }` (hex pubkey).

| Export                                     | Does                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `profilePlugin`                            | The plugin: `validate` (keys, `metadata.max`), `extraTags` (the `p` tags), `resolveFromTags` |
| `personFromText(text)`                     | The person in an `npub`, `nprofile` (its first relay hint), hex key or `nostr:` link |
| `personTag(person)`, `peopleFromTags(tags, tagName?)` | A person's `p` tag; the people in an event's tags, each once  |
| `withPerson(people, person)`, `withoutPerson(people, pubkey)` | Adding (or updating a role) and removing            |
| `fieldRoles(field)`                        | The roles a field suggests (`metadata.roles`)                            |
| `searchProfiles(query, { relays?, limit? })` | Profiles (kind 0) matching a name, through NIP-50 search relays; names starting with the query first; 2 characters at least |
| `DEFAULT_SEARCH_RELAYS`, `profileName(pubkey, profile?)` | The relays searched by default; what a profile is called |

Few relays search profiles (NIP-50), so `DEFAULT_SEARCH_RELAYS` (`wss://relay.nostr.band`,
`wss://search.nos.today`) can be replaced per field with `metadata.searchRelays`. Pasting an
`npub` works without search.

### Mentions

Attached to a text field (`attachTo: 'content'`), the field gives `@` mentions: typing `@` and a
name suggests profiles (`textareaCompletion`), and the picked one goes into the text as
`nostr:npub…` (NIP-27), which clients show as the person's name. Its `enrichFormData` adds the
people mentioned in the text to the field, so they get `p` tags. The standard kind 1 post manifest
has such a field (`mentions`, hidden in the view: the text shows them).

| Export                                 | Does                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `mentionsIn(text)`                     | The people in a text's `nostr:npub…` / `nostr:nprofile…`    |
| `mentionCompletion(pubkey, profile)`   | A suggestion: the profile's name, inserting `nostr:npub…`   |

Manifest keys are in [MANIFEST.md](../../MANIFEST.md#plugin-metadata).

## `/web`

```ts
import '@nostr-post/plugin-profile/web';
```

Defines `<np-profile-input>` and `<np-profile-view>` and registers the plugin with them. The
composer loads it by itself for manifests with `uiPlugin: 'profile'`.

- `<np-profile-input>`: `.value`, `.field`. The picked people with a role input each (suggestions
  from `metadata.roles`), and a search box: typing a name searches, pasting an `npub` adds them.
  Dispatches `np-value-changed`.
- `<np-profile-view>`: avatars, names and roles.

Both take `messages` (`Partial<ProfileMessages>`, defaults in `DEFAULT_PROFILE_MESSAGES`) for
translations.
