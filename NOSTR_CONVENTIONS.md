# Nostr Conventions

What nostr-post writes to Nostr beyond the NIPs, and what other clients see of it. Standard
usage (NIP-01, 09, 10, 23, 27, 32, 51, 52, 54, 73, 78, 98) is described where it's used:
[MANIFEST.md](./MANIFEST.md), the package READMEs. This file lists only our own tags, values and
formats, so that other apps can read our events and so we know what can surprise other clients.

Relays store unknown tags as they are, and only single-letter tags are indexed (`#x` filters), so
multi-letter tags below (`rating`, `source`, `name`) can be read but not queried by relays.

## Manifests

Manifests are NIP-78 app data (kind 30078):

| Tag / field | Value                                    | Notes                                                              |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------ |
| `d`         | `nostr-post:<manifest id>`               | Our prefix; the address is `30078:<pubkey>:nostr-post:<id>`        |
| `a`         | the manifest's own address               | Lets `#a` find a manifest and every post made with it in one query |
| `name`      | `metadata.name`                          | Not defined by a NIP; for display in lists                         |
| `t`         | `metadata.tags`, plus always `nostr-post` | Discovery                                                          |
| content     | the manifest as JSON                     |                                                                    |

## Which manifest an event was made with

Posts and wiki pages carry (see [MANIFEST.md](./MANIFEST.md#which-manifest-an-event-was-made-with)):

- `["L", "nostr-post"]`, `["l", "<manifest id>", "nostr-post"]`: NIP-32 labels in our own namespace.
- `["a", "30078:<pubkey>:nostr-post:<id>"]`: the published manifest. Other clients may show it as a
  reference to an event they can't display.

## Tags a manifest writes

A manifest field writes to any tag name its `mapTo.tagName` gives, so manifests can invent tags.
Tags in the example manifests (`tools/manifest-creator/lib/examples.ts`) that no NIP defines:

| Tag                         | Value                        | Notes                                                       |
| --------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `rating`                    | `<value>/<max>`, e.g. `4/5`  | `plugin-stars`; reading also takes a plain number           |
| `venue`, `origin`, `roast`, `brew` | free text             | Example manifests only                                      |
| `title` on kind 1           | text                         | NIP-23/NIP-52 define `title`; kind-1 clients ignore it      |
| `location` on kind 1, 30818 | place name                   | NIP-52's tag, used on other kinds by the venue field        |

## External IDs (`i` tags)

NIP-73 defines URLs, `isbn:`, `geo:`, `iso3166:`, `isan:`, `doi:`, `#`, `podcast:…` and blockchain
IDs. We also write our own namespaces:

| Value                        | Written by                    | Meaning                                                  |
| ---------------------------- | ----------------------------- | -------------------------------------------------------- |
| `osm:node\|way\|relation:<id>` | venue field, venue wiki pages | An OpenStreetMap object                                  |
| `gplace:<place id>`          | venue field (Google provider; a pasted short link) | A Google Places place ID: the only thing kept from Google (its terms allow keeping coordinates 30 days at most) |
| `gcid:<cid>`                 | venue field (Google Maps link) | A Google Maps CID, link worked out from it               |
| `wikidata:Q<id>`             | venue field (cities, countries) | A Wikidata item                                        |
| `<prefix>:<id>`              | `identifier` field            | Any prefix a manifest sets (`metadata.prefix`), e.g. the examples' `gtin`, `ean`, `upc`, `asin` |

Each kind of `i` tag on an event also gets NIP-73's `k` tag (`@nostr-post/core/nip73`): a URL is
`web`, a hashtag `#`, any other ID its prefix (`iso3166:CZ` → `iso3166`), our own namespaces
included (`osm:node:123` → `osm:node`, `gcid:…` → `gcid`). Posts get them from the coordinator,
wiki pages from `manifestToWikiEvent` and the venue hub.

Geohashes are `g` tags with every prefix (`u2fk`, `u2fkb`, …), as NIP-52 suggests, on kind 1 and
wiki pages too.

## Wiki pages (NIP-54, kind 30818)

- **d-tag:** the normalized title plus a type suffix from the entity manifest's `dTagTemplate`
  (`bitcoin-beer`). Pickers find entities of a type by that suffix.
- **Infobox:** the content starts with a Djot table of the entity's fields; references in it are
  NIP-54 wikilinks (`[Pivovar Z][pivovar-z-brewery]`). Other wiki clients show it as a table.
- **`["source", "OpenStreetMap", <copyright URL>, "node/123/v42"]`:** venue pages imported from
  OSM: attribution and the imported object version, which tells the venue hub when OSM has a newer
  one.

## Posts as app data (kind 30078)

A manifest can publish a post as kind 30078 instead of or next to kind 1 (`publishFormats`). The
content is JSON keyed by field id (`{"rating": 4, "tasting_at": "30818:…"}`). Only apps that know
the manifest show these.

With two kinds at once (`kinds: [1, 30078]`), the note (kind 1) is signed first and each other
event links to it with `["e", <note id>]`, which `<nostr-post-view>` uses to find a note's data copy
(`#e`) and the feed to show the post once. The link has no NIP-10 marker and never goes on a note,
so no client shows an event as a reply to its own copy. Events published before had
`["e", <id>, "", "root"]`; it's read the same way.

## Roles in plain text

A reference field mapped to an `a` tag and to the content of a plain-text kind (kind 1, NIP-52
calendar events) appends one line per entity after the text, `<field label>: nostr:naddr1…`
(NIP-27), e.g. a gig's `Performers: nostr:naddr1…`. An entity without a page gets a line with its
name and web links instead, `Performers: Not Proven (https://notproven.bandcamp.com)`, also when
the text names it; its links are `i` tags too. Other clients show the lines and links; our view
reads the role from the label, hides the lines and shows a row per page and per name (as a page
when one created later has one of its links). The `.ics` export
leaves them out. A reference field mapped only to an `a` tag shows the same rows in our view
(`<np-wiki-entity-view>`), but other clients see nothing of it.

## Update comments

A comment (kind-1 reply or NIP-22 comment, see below) whose every line is
`update: <field id>: <value>` changes that field in our view (`@nostr-post/core` `eventUpdates`).
Other clients show it as an ordinary comment, and the event itself never changes.

- **Applied** from the event's author, from people it names in a `p` tag with role `host`,
  `co-host`, `organizer` or `editor` (`["p", pubkey, relay, "organizer"]`; NIP-52 defines the
  role, not that it may edit), and from editors the app adds (a calendar's maintainer).
- **Suggested** from everyone else: listed in the view, applied only for a viewer who accepts one.
- Values are read by the field's type: numbers, booleans (`yes`/`no`, `true`/`false`, …), enum
  option labels or values, JSON for object fields.
- Different viewers can see different versions of an event (which suggestions they accepted).

## Comments

Standard (`@nostr-post/core/comments`):

- On a note (kind 1): kind-1 replies with NIP-10 `e` tags (`root`, `reply`).
- On anything else (calendar events, wiki pages, kind-30078 posts): NIP-22 comments (kind 1111). On
  an addressable event the root is its address (`A`), so comments stay with it when it's republished
  as a new version, and the feed asks for `#A`.

## Reactions (NIP-25)

Standard: kind 7 with the reacted event's `e`, `p` and kind (`k`), and on an addressable event its
address (`a`), so likes stay with it when it's republished; the feed asks for `#a` too and counts
likes on earlier versions for the current one. Likes we published before have no `a` or `k` tag:
they stay with the version they liked.

## Lists (NIP-51)

Bookmark sets (kind 30003) and people sets (30000) are standard; their d-tags are ours:
`nostr-post:<listType>:<id>` (`nostr-post:venue:visited`), `nostr-post:<slug of the name>` for
lists created by name, or a manifest's fixed `dTag`. Other clients show them as normal sets.

## Imported events (NIP-48)

Events that come from elsewhere (a gig from a venue's page or a Facebook event, an `.ics` entry,
a Gancio event) carry NIP-48's proxy tag, `["proxy", <id>, <protocol>]`: `web` with the page's
URL, `activitypub` with the object's URL, `rss` with the feed URL and the item's guid as
fragment, `atproto` with an AT URI. No convention of our own and no extra label: the tag itself
says the event is imported.

- Written by the calendar manifest's **Source** field (`tagExtra: ['web']`), filled by
  `icsToDrafts` (an entry's `URL`) and the gigs AI (the page the post came from).
- Shown under any post that has one as "Imported from <site>", linking the source; this also
  covers notes bridged from Mastodon (Mostr).
- `#proxy` queries tell whether an event was already imported, so importers can avoid duplicates.

## Calendar (NIP-52)

- **`D` tags on all-day events (31922):** one per day, as on timed events, so a `#D` query finds
  both kinds. NIP-52 defines `D` only for timed events (31923); other clients ignore the extra tags.
  Other clients' all-day events have no `D` tags, so a date query doesn't find them
  (calendars name them instead, [#81](https://github.com/saintego/nostr-post/issues/81)).
- **d-tag `ics:<UID>`** for events imported from iCalendar, so importing the same file again
  updates them instead of adding copies.
- **RSVP (31925) d-tag:** the calendar event's address, so one RSVP per person and event; NIP-52
  leaves the d-tag free.
