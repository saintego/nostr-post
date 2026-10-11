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
  linkManifest: true,             // add an `a` tag to posts so viewers can load this manifest
  fields: [/* see Fields */],
  metadata: { name: "Venue review", description: "Review a place", author: "…", tags: [] },
}
```

| Key              | Description                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `version`  | Required. The id identifies the manifest; publish a new version under the same id                                                                        |
| `extends`        | A parent's address or bare id, or an array of them; fields are merged by id ([inheritance](./ARCHITECTURE.md#manifest-inheritance))                      |
| `publishFormats` | Choices of event kinds (`kinds`), the `default` one, and whether the author can pick (`userSelectable`). Without it, kinds come from the fields' `mapTo` |
| `linkManifest`   | Default `true`. `false` for manifests that only preset the editor (e.g. hashtags) and need no custom view                                                |
| `metadata`       | `name`, `description` (shown in the composer's header), `author`, `tags`                                                                                 |
| `wikiConfig`     | Wiki entity manifests only, see [below](#wiki-entity-manifests)                                                                                          |

## Fields

```typescript
{
  id: "rating",
  type: "number",                 // string | number | boolean | enum | geo | ref
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
| `uiPlugin`     | Built-in inputs: `text`, `textarea`, `number` (`metadata.min`/`max`/`step`), `select` (with `options`). Plugins: see [below](#plugin-metadata)    |
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
  { value: "american-ipa", label: "American IPA", group: "21. IPA", code: "21A" },
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
| `code`        | The option's code in an external list (e.g. a BJCP style code). Not published; may repeat |

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
styles, mapped to `t` for posts and wiki entities; the beer entity extends it.

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
| `venue`              | `geo`    | Like `geo`, plus `providers` (`['osm']`, `'google'` with `googleApiKey`) and `wikiEntity`: the venue's wiki page, see [venue hub](#venue-hub)                                                                                  |
| `list`               | `string` | `relays`, `allowCreate`, `allowDelete`, `defaultList`, `multiple` (default `true`)                                                                                                                                             |
| `wiki-entity-picker` | `ref`    | `entityManifest`: the entity type ([reference](#referencing-entity-manifests)), which limits search to it and enables "+ Create"; `relays`; `minSearchLength` (2); `emitExtraTags` (`false`: don't copy the entity's `i` tags) |

Deprecated: `hashtag.autoExtractFrom`, `media.urlAutoExtractFrom` and `reference.enrichFrom`
name the source field for manifests without `attachTo`.

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
| `label` | Link text, e.g. the site's name                                                                                                       |
| `url`   | `{i:<namespace>}`: the entity's `i` tag value without the prefix (`{i:osm}` → `node:123`); `{fieldId}`: a field's value (URL-encoded) |
| `when`  | Optional: `{ field, equals }`, shown only when that field's value matches (case-insensitive)                                          |

A link is left out when a placeholder has no value. The wiki view shows these next to the links
from `i` tags (OpenStreetMap, Google Maps) and `r` URL tags.

### Referencing entity manifests

`entityManifest` (picker) and `wikiEntity` (venue) take an entity manifest reference:

- **A published manifest's address** (`30078:<pubkey>:nostr-post:<id>`), fetched from relays.
  Works in any app without setup.
- **An inline manifest object.**
- **An id registered with `registerEntityManifest(manifest)`**: app-local, e.g. for examples.

An entity manifest can `extends` others like any manifest; parents are looked up among registered ids
first, then on relays.

Without a manifest, `<nostr-wiki-view>` uses `STANDARD_WIKI_MANIFEST`, which shows the article text.

### Venue hub

A `venue` field with `metadata.wikiEntity` also creates the venue's wiki page from OpenStreetMap
when a review is published, or updates it when OSM has a newer version of the place. The review
links to it with an `a` tag. The author sees what will happen, an editable slug and an opt-out
checkbox next to the publish button. This runs when `<nostr-post-composer auto-publish>` publishes;
apps that publish `nostr-post-submit` themselves call `runBeforePublish` (see the
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
