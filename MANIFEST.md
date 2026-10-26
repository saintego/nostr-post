# Manifest Reference

A manifest describes a kind of post or wiki entity: its fields, where each field is stored on
Nostr, and which UI plugin edits and shows it. Manifests are plain JSON, so they can be published
on Nostr (NIP-78, kind 30078) and loaded by any app by address (`30078:<pubkey>:nostr-post:<id>`).

A manifest documents itself: `metadata.description` says what it is for, and each field's
`metadata.description` says what the field means and where its value comes from. Composers show
field descriptions as help text, and views show them as a tooltip on the label. Write them for the
people filling in and reading posts. This file documents the keys; a manifest's own descriptions
document its fields.

Types: `NostrPostManifest`, `PostField` and `FieldMetadata` in `@nostr-post/core/types`;
`WikiManifest` in `@nostr-post/wiki`. Validation: `validateManifest` in `@nostr-post/core/manifest`.

- [Manifest](#manifest)
- [Fields](#fields)
- [Field metadata](#field-metadata)
- [Enum options](#enum-options)
- [Plugin metadata](#plugin-metadata)
- [Wiki entity manifests](#wiki-entity-manifests)

## Manifest

```typescript
{
  id: "venue-review-v1",          // unique id; the d-tag when published
  version: "1.0.0",
  extends: "30078:<pubkey>:nostr-post:base-review", // optional parent(s)
  publishFormats: [               // optional: which event kinds a post is published as
    { id: "note", label: "Note", kinds: [1], default: true },
    { id: "app-data", label: "App data", kinds: [30078], userSelectable: true },
  ],
  linkManifest: true,             // tag posts and wiki pages with this manifest (label, and `a` when published)
  fields: [/* see Fields */],
  metadata: { name: "Venue review", description: "Review a place", author: "…", tags: [] },
}
```

| Key              | Description                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `version`  | Required. The id identifies the manifest; publish a new version under the same id                                                                        |
| `extends`        | A parent's address or bare id, or an array of them; fields are merged by id ([inheritance](./ARCHITECTURE.md#manifest-inheritance))                      |
| `publishFormats` | Choices of event kinds (`kinds`), the `default` one, and whether the author can pick (`userSelectable`). Without it, kinds come from the fields' `mapTo`. `kinds: []` publishes no event of its own, only what plugins' publish hooks do, e.g. [save a place to lists](#lists) |
| `linkManifest`   | Default `true`: events made with it carry its [label and address](#which-manifest-an-event-was-made-with). `false` for manifests that only preset the editor (e.g. hashtags) and need no custom view, like the standard post and wiki manifests |
| `metadata`       | `name`, `description` (shown in the composer's header), `author`, `tags`                                                                                 |
| `lists`          | Lists people save events made with it to, e.g. a venue type's "Want to go", see [lists](#lists)                                                         |
| `listType`       | The type part of those lists' d-tags; default the manifest's `id`, see [lists](#lists)                                                                   |
| `wikiConfig`     | Wiki entity manifests only, see [below](#wiki-entity-manifests)                                                                                          |

### Which manifest an event was made with

Posts and wiki pages made with a manifest (`linkManifest` not `false`) say so in two ways:

- **Label** (NIP-32), always: `["L", "nostr-post"]`, `["l", "<manifest id>", "nostr-post"]`, also when
  the manifest isn't published (local or inline).
- **Address**, when the manifest is published: `["a", "30078:<pubkey>:nostr-post:<id>"]`, the exact
  manifest (the composers' `manifestRef` / `manifest-ref`).

Relays can combine the label with other tags: a related section of one manifest asks for
`#a` (the entity) and `#l` (the manifest), so a busy venue's beer reviews don't come with every other
post linking it. Posts from before labels existed (`a` tag only) don't show up in such a section.

`<nostr-post-view>` and `<nostr-wiki-view>` find the manifest themselves (`fetchManifestForEvent`): the
address; else by the label's id (published manifests have the d-tag `nostr-post:<id>`): one the app
registered, then any author's published one. A manifest found by id can differ from the one the event
was made with (same id by another author, or a changed version), so it's used only when the event's
tags fit its fields, and the view says when it's another author's; else the event is shown
unformatted.

## Lists

`lists` names the lists people save events made with the manifest to (see
[plugin-list](./packages/plugin-list/README.md)): any events, posts as well as wiki pages. They are
offered first, before the user's other lists and a new one, by the Save button on those events
(`<nostr-post-view>`, `<nostr-wiki-view>`, `<np-venue-view>`) and by `list` fields. Without `lists`
the events have no Save button.

```typescript
{
  id: "venue-entity-v1",
  lists: [
    { id: "want-to-go", label: "Want to go" },
    { id: "visited", label: "Visited" },
    { id: "favourites", label: "Favourites", dTag: "nostr-post:favourites" }, // shared with other types
  ],
  listType: "venue",
}
```

| Key        | Description                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `id`       | Short and free (`visited`). The user's list has the d-tag `nostr-post:<listType>:<id>` (`nostr-post:venue:visited`), so another manifest's `visited` is another list. A manifest extending this one replaces the entry with the same `id` (e.g. to translate its label) and inherits the others |
| `label`    | The list's title when it's created; the user's list keeps its own title afterwards             |
| `dTag`     | Optional fixed d-tag instead, to share one list across manifests (`nostr-post:favourites`). Lists of other apps can clash with it; the `nostr-post:` prefix makes that unlikely. A list the user creates by name gets `nostr-post:<slug of the name>`, so creating "Favourites" is that same list |
| `listType` | Manifest key: the type part of the d-tags, default the manifest's `id`. Set it when the id has a version (`venue-entity-v1`), so later versions and extending manifests (they inherit it) share the user's lists |

Lists shown together with the same title get the type from their d-tag ("Liked (beer)", "Liked (venue)"),
and typing the name of a list the user has ticks that list instead of creating another.

A `list` field saves to the lists the author ticks, once the post is published; it adds nothing to the
post. With `metadata.saveField` it saves that field's wiki entity (the venue field's page, which it may
have just created) and offers that entity manifest's `lists`; without it, it saves the post itself and
offers the post manifest's own `lists`. A review can have both. With a publish format of `kinds: []` a
manifest only saves:

```typescript
publishFormats: [{ id: "save", label: "Save only", kinds: [], default: true }],
fields: [
  { id: "venue", type: "geo", uiPlugin: "venue", mapTo: { kind: 1, target: "tag", tagName: "g" },
    metadata: { wikiEntity: "venue-entity-v1" } },
  // listField({ saveField: "venue", label: "Save to lists" }) from @nostr-post/plugin-list
  { id: "venue_lists", type: "string", uiPlugin: "list", mapTo: { kind: 1, target: "tag", tagName: "lists" },
    metadata: { label: "Save to lists", saveField: "venue" } },
]
```

## Fields

```typescript
{
  id: "rating",
  type: "number",                 // string | number | boolean | enum | geo | ref | date | profile
  uiPlugin: "stars",              // the input/view: a plugin id or a built-in input
  mapTo: { kind: 1, target: "tag", tagName: "rating" },
  required: true,
  metadata: { label: "Rating", description: "Overall impression, 1–5", max: 5 },
}
```

| Key            | Description                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Unique within the manifest; the key in form data                                                                                                  |
| `type`         | Value type for validation                                                                                                                         |
| `uiPlugin`     | Built-in inputs: `text`, `textarea`, `number` (`metadata.min`/`max`/`step`), `select` (with `options`). Plugins: see [below](#plugin-metadata). The view shows a built-in input's tag as text: `title` as the heading, others as "label: value", web links clickable |
| `mapTo`        | Where the value is stored, or an array of places (one per kind)                                                                                   |
| `mapBehavior`  | With several `mapTo` entries: `first-active` (default) or `all-active` (write to every published kind)                                            |
| `required`     | The post can't be published without a value                                                                                                       |
| `options`      | Allowed values of an `enum` field: strings or objects with a label, see [enum options](#enum-options)                                             |
| `defaultValue` | Prefilled value                                                                                                                                   |
| `visibility`   | `{ edit: 'visible' \| 'hidden' \| 'readonly', view: 'visible' \| 'hidden' }`                                                                      |
| `attachTo`     | Id of another field this one works on instead of showing its own input, e.g. hashtags extracted from the text field, with a button in its toolbar |
| `metadata`     | See below                                                                                                                                         |

`mapTo` targets:

| `target`    | Stored in                                                                     | Notes                                                   |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| `'content'` | The event content. For NIP-78 (30078) posts a JSON object, at `path` if given | `path`: dot path, e.g. `"venue.address.city"`           |
| `'tag'`     | A tag named `tagName`: relay-filterable                                       | e.g. `t`, `a`, `i`, `g`, `title`, `rating`              |
| `'table'`   | A row of the infobox table in a wiki entity's content (kind 30818 only)       | Written by `@nostr-post/wiki`, not the core coordinator |

## Field metadata

Keys every field understands (`FieldMetadata`):

| Key           | Description                                                                      |
| ------------- | -------------------------------------------------------------------------------- |
| `label`       | Shown in composers and views; default: the field id                              |
| `description` | What the field means and where its value comes from: help text and label tooltip |
| `placeholder` | Example input shown in an empty input                                            |

Plugins read further keys from the same object.

## Enum options

An `enum` field's `options` are plain strings, or objects when the text people see differs from the
stored value:

```typescript
options: [
  { value: "american-ipa", label: "American IPA", group: "21. IPA", code: "21A", category: "21" },
  { value: "kellerbier", label: "Kellerbier", group: "27. Historical Beer", code: "27A" },
  "other",
]
```

| Key           | Description                                                                               |
| ------------- | ----------------------------------------------------------------------------------------- |
| `value`       | Required, unique. What is published, through the field's `mapTo` like any field value    |
| `label`       | Shown in selects and views; default: the value                                            |
| `group`       | Selects list the option under this heading (`<optgroup>`); the search list shows it beside the option |
| `description` | Tooltip on the option                                                                     |
| other keys    | Strings that aren't published, e.g. `code` and `category` in an external list. They may repeat; [link templates](#derived-links) read them as `{fieldId.key}` |

Composers show a select, or for more than 20 options a search input that filters the labels as
you type (`metadata.searchable: true | false` overrides that). Text that matches no option clears
the value.

The value is published once, where `mapTo` says, so an event holds one piece of information per
field. Prefer readable values (`american-ipa` in a `t` tag) over codes few people know. A wiki
infobox row (`table` target) shows the label instead, for clients without the manifest. Reading
matches a stored text to the option by value, or by value or label ignoring case, so events written
with an older list still load.

Long, shared lists belong in a base manifest that other manifests `extends`. The manifest creator's
`beer-style-bjcp-2021` example (`tools/manifest-creator/lib/manifests/beerStyleBjcp2021.json`) holds the 121 BJCP 2021 beer
styles, mapped to `t` for posts and wiki entities; the beer entity extends it and links each style to bjcp.org with
`https://www.bjcp.org/style/2021/{style.category}/{style.code}/`.

## Plugin metadata

| `uiPlugin`           | `type`   | Metadata keys                                                                                                                                                                                                                  |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stars`              | `number` | `min`, `max`, `step`, `showNumber`                                                                                                                                                                                             |
| `markdown`           | `string` | `defaultMode` (`'wysiwyg'` \| `'raw'`), `minLength`, `maxLength`, `minHeight`                                                                                                                                                  |
| `hashtag`            | `string` | `maxTags` (20), `suggestions`, `autoExtract` (from the `attachTo` field, default `true`)                                                                                                                                       |
| `media`              | `string` | `accept` (MIME types), `maxSize` (bytes), `maxFiles`, `uploadUrl`, `allowUrl`, `allowUpload`, `urlAutoExtract`                                                                                                                 |
| `reference`          | `string` | `urlDedupeMode` (`'normalized'` \| `'exact'` \| `'origin-path'`)                                                                                                                                                               |
| `identifier`         | `string` | `prefix` (NIP-73 namespace, e.g. `isbn`)                                                                                                                                                                                       |
| `geo`                | `geo`    | `precision` (geohash length, default 6), `defaultZoom`, `allowSearch`                                                                                                                                                          |
| `date`               | `date`   | `precision` (`'day'` default \| `'time'`), on kinds other than NIP-52 calendar events, see [dates](#dates)                                                                                                                      |
| `embed`              | `string` | `multiple` (several links). Links show as players (YouTube, Spotify, SoundCloud, Vimeo, Bandcamp player links), others as links |
| `profile`            | `profile` | `roles` (role suggestions, e.g. `['host', 'speaker']`), `max` (most people), `searchRelays` (NIP-50 relays to search profiles; default `DEFAULT_SEARCH_RELAYS`). The value: `{ pubkey, role?, relay? }[]`, written as `["p", pubkey, relay, role]`. With `attachTo` a text field: `@` mentions in it (`nostr:npub…`), the people mentioned get `p` tags |
| `venue`              | `geo`    | Like `geo`, plus `providers` (`['osm']`, `'google'` with `googleApiKey`) and `levels` (`['country', 'city', 'place']`, default exact places, see [location levels](#location-levels)), `wikiEntity`: the venue's wiki page, see [venue hub](#venue-hub); `linkOnly` (only the page's `a` tag and role, no venue tags, see [roles in posts](#references-with-a-role-in-posts)); `multiple` (several venues, a list)                                                                                  |
| `list`               | `string` | `saveField`: the field whose wiki entity is saved (a `venue` field's page, a `wiki-entity-picker`'s entity); without it, the post itself. `relays`. The value: list addresses and `new:<title>`. See [lists](#lists) |
| `wiki-entity-picker` | `ref`    | `entityManifest`: the entity type ([reference](#referencing-entity-manifests)), which limits search to it and enables "+ Create"; `relays`; `minSearchLength` (2); `emitExtraTags` (`false`: don't copy the entity's `i` tags); `multiple` (pick several; the value is a list) |

Deprecated: `hashtag.autoExtractFrom`, `media.urlAutoExtractFrom` and `reference.enrichFrom`
name the source field for manifests without `attachTo`.

### Dates

A `date` field's value is `{ start, end?, tzid? }`: wall-clock dates (`YYYY-MM-DD`) or times
(`YYYY-MM-DDTHH:mm`) and an IANA time zone (default: the viewer's). How it is stored depends on the
kind it is written to:

| Kind            | `start` / `end`                                    | Also written                                  |
| --------------- | -------------------------------------------------- | --------------------------------------------- |
| 31922 (all-day) | `YYYY-MM-DD`; `end` is the day after the last day  | one `D` tag per day                           |
| 31923 (timed)   | unix seconds                                       | `start_tzid`, `end_tzid`, one `D` tag per day |
| any other       | its `mapTo` tag at `metadata.precision`, no `end`  | nothing                                       |

`D` tags are unix day numbers (`floor(unix / 86400)`), at most 366 per event. NIP-52 defines them
for timed events; on all-day events they are an extra tag, so relays can return those by day too.

`@nostr-post/calendar` exports a ready calendar event manifest, `CALENDAR_EVENT_MANIFEST`
(title, date, location, description, summary, image, tags). A calendar event manifest maps the
field to `start` on both kinds and offers them as two publish
formats, so the composer's format picker chooses all-day or timed and the input follows:

```json
{
  "publishFormats": [
    { "id": "all-day", "label": "All-day", "kinds": [31922], "default": true, "userSelectable": true },
    { "id": "timed", "label": "Timed", "kinds": [31923], "userSelectable": true }
  ],
  "fields": [
    {
      "id": "when",
      "type": "date",
      "uiPlugin": "date",
      "required": true,
      "mapTo": [
        { "kind": 31922, "target": "tag", "tagName": "start" },
        { "kind": 31923, "target": "tag", "tagName": "start" }
      ]
    }
  ]
}
```

## Wiki entity manifests

Wiki entities (NIP-54, kind 30818) are pages many people edit, such as a beer, a brewery or a venue.
Their manifests map fields to `tag`, `table` (infobox rows) and `content` (the article), and
add `wikiConfig` (type `WikiManifest`). See [packages/wiki](./packages/wiki/README.md) for the
components and API.

```typescript
wikiConfig: {
  titleTemplate: "{name} (Beer)",   // => "Bitcoin (Beer)"
  dTagTemplate: "{name}-(beer)",    // => "bitcoin-beer"
  links: [{ label: "Untappd", url: "https://untappd.com/b/{i:untappd}" }],
}
```

### Related items

`wikiConfig.related` lists items on the entity's page, e.g. a brewery's beers or a beer's reviews: events
whose `a` tags point at any version of the entity (every author's version has its own address).

```typescript
related: [
  { label: "Beers", kinds: [30818], dTagSuffix: "-beer", role: "breweries" },
  { label: "Reviews", kinds: [1, 30078], manifest: "beer-review-v1" },
]
```

| Key          | Description                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `id`         | Optional stable key: a manifest extending this one replaces the section with the same `id` (else the same `label`), e.g. to translate it |
| `label`      | The section's heading                                                                              |
| `kinds`      | Event kinds to list: `30818` for wiki entities, e.g. `1`/`30078` for reviews                        |
| `dTagSuffix` | Wiki entities of one type, by the suffix of their d-tags (`-beer`)                                  |
| `role`       | Only wiki entities whose [role row](#references-with-a-role) (this field id) links this entity     |
| `manifest`   | Only events linking this manifest (its id)                                                         |
| `limit`      | Items shown at first (20); "Show more" asks for more                                               |
| `stats`      | `{ tag, max }`: how many posts and the average of that tag ("12 in total · ★ 4.3 / 5")              |
| `gallery`    | `true`: the images of the section's posts (`r` URLs of image files, `imeta` images)                |

Wiki entities are listed in their newest version and open their page on demand; posts show a short
text. A section with `stats` or `gallery` reads up to 500 posts for them, computed when shown and
never stored, and still lists `limit`. `<nostr-wiki-view>` shows the sections unless it has `hide-related`.

Keep sections to the entity type itself; domain sections belong in a manifest that `extends` it, which
only lists what it adds (sections and links merge by `id`, else `label`, see
[inheritance](./ARCHITECTURE.md#manifest-inheritance)). Like any extending manifest it can add fields
too, and create pages: they stay pages of the same type as long as it keeps the parent's title and
d-tag templates, and a viewer using the parent shows the added fields among "all data". An app can
also define an extension in its code, unpublished, just to view pages its way.

The same works for translations: a manifest extending another with the same field ids and section or
link ids, and only translated labels, shows the pages in another language:

```typescript
{ id: "venue-entity-v1-cs", extends: "venue-entity-v1",
  fields: [{ id: "name", metadata: { label: "Název" } }],
  wikiConfig: { related: [{ id: "reviews", label: "Recenze", kinds: [1, 30078], manifest: "venue-review-v1" }] } }
```

### Title and d-tag templates

Entity slugs share one namespace with every wiki article, so a beer called "Bitcoin" would collide
with the article about Bitcoin. Templates scope them:

- `{fieldId}` is replaced by the field's value. For a reference field (a picked entity) it's the
  entity's name. Static text is kept, and the d-tag is normalized.
- Without `dTagTemplate`, the d-tag is derived from the title.
- The fixed text around the first placeholder is the entity type: pickers search only d-tags with
  it (e.g. ending in `-beer`).
- When a new entity's slug is taken, the composer asks for a distinguishing detail. The detail
  goes into the name part of both the title and the d-tag, e.g. "Bitcoin (Moonshine Beer)",
  `bitcoin-moonshine-beer`. Slugs are never changed automatically.

### Derived links

`wikiConfig.links` adds links to external pages worked out from the entity's data when it's
shown. They aren't stored on the event, so a site changing its URLs needs only a manifest update.

| Key     | Description                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | Optional stable key: a manifest extending this one replaces the link with the same `id` (else the same `label`)                        |
| `label` | Link text, e.g. the site's name                                                                                                       |
| `url`   | `{i:<namespace>}`: the entity's `i` tag value without the prefix (`{i:osm}` → `node:123`); `{fieldId}`: a field's value; `{fieldId.key}`: a key of the option selected in an enum field (`{style.code}`). Values are URL-encoded |
| `when`  | Optional: `{ field, equals }`, shown only when that field's value matches (case-insensitive)                                          |

A link is left out when a placeholder has no value. The wiki view shows these next to the links
from `i` tags (OpenStreetMap, Google Maps) and `r` URL tags.

### References with a role

An entity can point to other entities in roles, e.g. a beer's breweries and the brewery it was
brewed at. Give each role its own `ref` field (`wiki-entity-picker`, usually `multiple`) mapped to
an `a` tag and to the infobox:

```typescript
{
  id: "brewed_at",
  type: "ref",
  uiPlugin: "wiki-entity-picker",
  mapTo: [
    { kind: 30818, target: "tag", tagName: "a" },
    { kind: 30818, target: "table" },
  ],
  metadata: { label: "Brewed at", entityManifest: "brewery-entity-v1", multiple: true },
}
```

- Every referenced entity is a plain `a` tag (`30818:<pubkey>:<d-tag>`), so `#a` queries find all
  entities that reference it, in any role.
- The infobox row lists the entities as NIP-54 wikilinks, `[Pivovar Z][pivovar-z-brewery]`, which
  any wiki client shows as links. Reading takes each role's entities from its row and their
  versions' pubkeys from the `a` tags.
- A `ref` field mapped only to an `a` tag gets the `a` tags no row claims. An entity written
  before its manifest had roles (plain `a` tags, no rows) reads into the first role field.
- One entity can have several roles (a collaboration brewed at one of its breweries); its `a` tag
  is written once.
- Other fields that write an `a` tag (e.g. a venue field linking its venue page) skip the `a` tags
  role rows claim, so a brewery's own location and its taprooms don't mix.
- A picker on venue pages (an entity manifest with `sources.osm` fields) creates missing ones from
  OpenStreetMap: "+ Create" searches OSM and runs the [venue hub](#venue-hub).
- Venues in a role can also be a `venue` field with `linkOnly`, `multiple` and `wikiEntity` mapped to an
  `a` tag and the infobox (the brewery's `taprooms`): the author searches OSM for each venue, the venue
  hub creates or links their pages when publishing, and the row lists them. The wiki composer builds
  the page again after its hooks, so the row names the linked pages.

### References with a role in posts

Posts reference entities in roles too, e.g. a beer review's beer, where it was tasted and where it
was bought. A `ref` field mapped to an `a` tag and to the content:

```typescript
{
  id: "tasting_at",
  type: "ref",
  uiPlugin: "wiki-entity-picker",
  mapTo: [
    { kind: 1, target: "tag", tagName: "a" },
    { kind: 1, target: "content" },
    { kind: 30078, target: "tag", tagName: "a" },
    { kind: 30078, target: "content", path: "tasting_at" },
  ],
  metadata: { label: "Tasted at", entityManifest: "venue-entity-v1" },
}
```

- Kind 1 (plain text): after the text, a NIP-27 mention line per entity, `Tasted at: nostr:naddr1…`,
  which other clients show as a link. Reading matches the line's label to the field (or, if the
  label changed, the next role field in order); the view shows the text without these lines and a
  row per role that opens the entity's page.
- NIP-78 (JSON): the entity's address under the field's key, `{"tasting_at": "30818:…"}`.
- Every entity is also a plain `a` tag; a reference field without a content mapping (the reviewed
  beer) gets the `a` tags no role claims.
- A field's mappings on the kind being published all apply (here the `a` tag and the content).
- Venues in a role use a `venue` field with `linkOnly: true` and `wikiEntity` instead of a picker:
  the author searches OpenStreetMap, the [venue hub](#venue-hub) creates or links the venue's page
  when publishing, and the post gets only the page's `a` tag and the role, no `i`/`g`/`location`
  tags, so several venues (tasted at, purchased at) don't mix. The composer builds the post again
  after the hooks ran, with the linked page in its role (`runPublishHooks`).

### Referencing entity manifests

`entityManifest` (picker) and `wikiEntity` (venue) take an entity manifest reference:

- **A published manifest's address** (`30078:<pubkey>:nostr-post:<id>`), fetched from relays.
  Works in any app without setup.
- **An inline manifest object.**
- **An id registered with `registerEntityManifest(manifest)`**: app-local, e.g. for examples.

An entity manifest can `extends` others like any manifest; parents are looked up among registered ids
first, then on relays.

Without a manifest, `<nostr-wiki-view>` uses `STANDARD_WIKI_MANIFEST`, which shows the article text.

### Google Maps links

Authors can paste a Google Maps link into a venue field's search. The link is read from its text
alone (no request to Google, whose terms don't allow taking data from its pages): its name, its
point and its CID. The same place is then searched on OpenStreetMap by that name around that
point. When OSM doesn't have it, the author clicks the place on the map (it zooms to the link's
point, without setting it), and the venue gets the author's point, OSM's address there and the link's name; its venue
page is created from that.

The CID is kept as `["i", "gcid:<cid>"]` (our namespace, not NIP-73); the Google Maps link
(`https://maps.google.com/?cid=…`) is worked out from it when shown. Venue pages are also found by
it, so a page created without OSM is filled from OSM once a post picks the OSM place with the same
link. Short share links (`maps.app.goo.gl`) only Google can open: the author pastes the full link.

With an app's Google Maps Embed API key (`configureVenuePlugin({ googleMapsEmbedKey })`, free and
unlimited; not a manifest key, since manifests are public), venues with a Google link show Google's
place card in the venue view: name, address, rating and review count, rendered by Google in an
iframe that loads when opened. Nothing from it is read or stored.

### Location levels

A `venue` field with `metadata.levels` can stand for a country, a city or an exact place, e.g. a
brewery's location: its brewery site, or only its city or country when it has no place of its own.
Search offers results of those levels (Nominatim's `addresstype`), and each gets:

| Level   | Tags                                                                                     |
| ------- | ---------------------------------------------------------------------------------------- |
| place   | `i` `osm:node:…`, `g` geohash and its prefixes, and the venue hub (below)                |
| city    | `i` `osm:relation:…`, `g` geohash of 4 characters and its prefixes                       |
| country | `i` `osm:relation:…`, no `g`                                                             |
| all     | `i` `iso3166:CZ` (NIP-73), `i` `wikidata:Q…` when OSM has one, `location` (the name)    |

So "everything in Czechia" is one `#i: ["iso3166:CZ"]` query, whatever level was picked. Cities
and countries get no wiki pages: their identity is ISO 3166, OSM and Wikidata, and disputed areas
follow OpenStreetMap.

### Venue hub

A `venue` field with `metadata.wikiEntity` also creates the venue's wiki page from OpenStreetMap
when a review (or a wiki page, e.g. a brewery's location) is published, or updates it when OSM has
a newer version of the place; only for an exact place, not a city or country. The review or page
links to it with an `a` tag. The author sees what will happen, an editable slug and an opt-out
checkbox next to the publish button. This runs when `<nostr-post-composer auto-publish>` or
`<nostr-wiki-composer auto-publish>` publishes; apps that publish `nostr-post-submit` or
`nostr-wiki-submit` themselves call `runBeforePublish` (see the
[composer docs](./USAGE_GUIDE.md#nostr-post-composer)).

The venue manifest's fields declare their OSM source with `metadata.sources.osm`:

- an OSM tag key, e.g. `opening_hours`;
- alternatives separated by `|`, first present wins: `amenity|shop|craft`;
- `@name`, `@street`, `@city` from the picked place's address.

Updates replace only these fields; fields without a source (e.g. the article) belong to the
community and are kept. The entity carries every external ID as an `i` tag (`osm:node:123`), a
geohash with its prefixes (`g`), and `["source", "OpenStreetMap", <copyright URL>, "node/123/v42"]`
for attribution and the imported version.

Bitcoin payments are OSM tags too, the data [BTC Map](https://btcmap.org) shows: `currency:XBT`,
`payment:lightning`, `payment:onchain`, `payment:lightning_contactless`, `check_date:currency:XBT`.
A venue manifest can map them to infobox rows and link to BTC Map with
`{ label: "BTC Map", url: "https://btcmap.org/merchant/{i:osm}", when: { field: "bitcoin", equals: "yes" } }`.
The manifest creator's `venue-entity-v1` example does both.
