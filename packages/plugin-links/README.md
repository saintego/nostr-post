# @nostr-post/plugin-links

Links in nostr-post, each shown the way its **rule** says:
- a **player** (YouTube, Spotify, SoundCloud, Vimeo, Bandcamp);
- a site's own **button** (Buy Me a Coffee, GitHub Sponsors, Ko-fi, …, in their colours);
- a **QR code** (`bitcoin:`, `lightning:`, `nostr:` links);
- a plain **link**.

Every link has a ⋯ menu: QR code (full screen), Copy link, Share, Open. The rules are JSON, so apps
and manifests add their own. Fields use it with `uiPlugin: 'links'`; `'embed'` is the same plugin
under its former name (it was `@nostr-post/plugin-embed`).

## Main entry (no UI)

```ts
import { configureLinks, embedFor, linkEntries, viewLink, linkRules } from '@nostr-post/plugin-links';

viewLink('coff.ee/alice', linkRules());
// { url: 'https://coff.ee/alice', format: 'button', rule: { name: 'Buy Me a Coffee', … } }
embedFor('https://youtu.be/dQw4w9WgXcQ');
// { provider: 'youtube', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' }
```

### Rules

A rule (`LinkRule`) is plain JSON:

```json
{ "id": "spotify-single", "format": "embed", "provider": "spotify", "name": "Spotify",
  "match": "^https?://open\\.spotify\\.com/(?:intl-[\\w-]+/)?(?<type>track|episode)/(?<id>\\w+)",
  "src": "https://open.spotify.com/embed/{type}/{id}", "height": 152 }
{ "id": "ko-fi", "format": "button", "name": "Ko-fi", "icon": "☕",
  "match": "^https://(?:www\\.)?ko-fi\\.com/", "brand": { "background": "#29abe0", "color": "#ffffff" } }
```

- `match`: a regular expression (case-insensitive). The first rule a link matches decides.
- `format`: `embed`, `button`, `qr` or `link` (also for links no rule matches).
- `embed`: `src` is the player's URL. `{group}` puts in a named group of `match`, `{group|uri}`
  the same URL-encoded, `{url}` the whole link. It must give an `https:` URL, else the link stays
  a link. `height`: an audio player's height; without it, a 16:9 video.
- `button`: `name`, `icon` and `brand` colours (hex).

The order: a field's rules (`metadata.rules`), then the app's (`configureLinks({ rules })`), then
the built-in ones (`DEFAULT_LINK_RULES`, in `defaultRules.ts`). A rule given again with the same
`id` replaces the later one. Manifests come from relays, so a field's rules may only make buttons,
QR codes and links, with hex colours (`safeFieldRules`). They can't add players, which would load
another site's page into the reader's.

Text without a scheme that looks like a domain (`ko-fi.com/alice`, `coff.ee/x`,
`youtube.com/watch?v=…`) is an `https://` link (`normalizeLink`). Text with `@` (an email, a
Lightning address) or spaces is not.

| Export | Does |
| --- | --- |
| `viewLink(link, rules)` | How a link shows: `{ url, format, rule?, src?, height? }` |
| `linkRules(field?)`, `DEFAULT_LINK_RULES` | A field's rules in order (its own, the app's, the built-in ones); the built-in ones |
| `configureLinks({ rules?, showUrl? })`, `linksSettings()` | The app's settings: its rules; `showUrl: false` shows players without their link under them (default: shown) |
| `normalizeLink(text)`, `isShowableLink(link, rules)` | `https://` added to a bare domain; whether a link is a web link or a URI a rule takes (no `javascript:` or `data:`) |
| `findRule`, `fillTemplate`, `mergeRules`, `safeFieldRules` | The rule engine's parts |
| `embedFor(link, rules?)` | The player for a link: `{ provider, src, height? }`, undefined for links without one. Built from the link alone, no requests |
| `linkProvider(link, rules?)` | The provider of a link, also of a Bandcamp page (which gets no player) |
| `linkEntries(value, field?)`, `linksOf(value, field?)` | The entries (`LinkEntry`: `{ url, label?, icon?, description? }`), or links, of a field's value that its rules can show |
| `parseLinkEntry(raw)`, `storedEntry(entry)` | An entry from stored data (a link, an object or its JSON); the stored form (the link alone when it has nothing else) |
| `linksPlugin`, `embedPlugin` | The plugin (`links`, and `embed` under its former id): `validate`; one entry per tag (JSON when it has a label); profile links also written as `i` tags |
| `showsUrl(field?, own?)` | Whether a player shows its link: the element's own choice, else the field's `metadata.showUrl`, else the app's setting, else yes |
| `profileLink(link)`   | The profile a link points to, in canonical form: `{ platform, url, handle? }`, or undefined for links that aren't profiles |
| `profileUrls(links)`  | The canonical profile URLs among links, without repeats                            |
| `linkFromEmbedCode(text)` | The link in a site's embed code (`<iframe src="…">`), e.g. Bandcamp's; other text as it is |
| `isCheckableLink(link)` | Whether `checkLink` can ask about a link: Spotify, SoundCloud (profiles too), YouTube videos |
| `checkLink(link, fetch?)` | Asks the provider (oEmbed) whether the link exists: `{ status: 'found', names }` (an artist's or channel's name, a title), `missing`, or `unknown` (can't ask, or it failed). Contacts the provider |
| `namesMatch(name, names)` | Whether a check's names are this name (ignoring case, accents, punctuation and words channels add, such as "Official" or "Topic"; also a whole part of a title such as "Name - Live") |
| `linksInText(text)`   | The links and `@` mentions in a text, as keys (`linkKey`: a profile's canonical URL, else the link without scheme and `www.`) |
| `keepKnownLinks(value, text, { hasImage?, confirmed? })` | `value` (e.g. an AI's JSON) with only the links `text` has, however written, or the user confirmed; `{ value, fromImage }`: with `hasImage`, links that can't be checked are kept and listed for the user to check |
| `checkSuggestedLinks(candidates, text, { hasImage?, fetchFn? })` | Links suggested for people (`{ name, link }`) that `text` doesn't have: checked with `checkLink` (`checked` when the provider knows them by that name; by another name: kept unchecked with the provider's `names`; dropped when the provider doesn't know them), or left unchecked for the user to open. Contacts the providers |

Players by provider:

| Provider   | Links                                                       | Player                         |
| ---------- | ----------------------------------------------------------- | ------------------------------ |
| YouTube    | `watch?v=`, `youtu.be/`, `shorts/`, `live/`, music.youtube, `playlist?list=` | `youtube-nocookie.com/embed/…` |
| Spotify    | `open.spotify.com/` track, album, playlist, artist, episode, show | `open.spotify.com/embed/…` |
| SoundCloud | `soundcloud.com/<user>/<track or sets/…>`                   | `w.soundcloud.com/player`      |
| Vimeo      | `vimeo.com/<id>`                                            | `player.vimeo.com/video/<id>`  |
| Bandcamp   | only `bandcamp.com/EmbeddedPlayer/…` links, or Bandcamp's embed code (Share / Embed): the album or track number is only on the page, not in its link | as given |


The field: `type: 'string'` for links (mapped to a tag such as `r`), `type: 'object'` for entries
with a label or description (in a NIP-78 post's content). Field metadata:
- `multiple` for several links;
- `showUrl: false` for players without their link under them;
- `layout: 'cards'` for each link as a card;
- `rules` for the field's own rules.

Profile links are also written as NIP-73 `i` tags with the canonical URL, so relays find
everything that links the same profile (`#i`), e.g. an artist's wiki page and the gigs that link
the artist:

| Platform   | Profile links                               | Canonical URL (handle)                         |
| ---------- | ------------------------------------------- | ---------------------------------------------- |
| Bandcamp   | `<name>.bandcamp.com/…`                     | `https://<name>.bandcamp.com` (name)           |
| Spotify    | `open.spotify.com/artist/<id>`              | `https://open.spotify.com/artist/<id>`         |
| SoundCloud | `soundcloud.com/<user>/…`                   | `https://soundcloud.com/<user>` (user)         |
| Instagram  | `instagram.com/<user>`                      | `https://www.instagram.com/<user>` (user)      |
| Facebook   | `facebook.com/<page>`, `profile.php?id=`    | `https://www.facebook.com/<page>` (page)       |
| YouTube    | `youtube.com/@<handle>`, `channel/<id>`     | `https://www.youtube.com/@<handle>` (handle)   |

`checkLink` tells a made-up link (e.g. one an AI suggested) from a real one, and `namesMatch` a
real one of someone else. `keepKnownLinks` and `checkSuggestedLinks` put them together for text an
AI read from a post: links the post has are kept, others are checked or offered to confirm. Bandcamp, Instagram and Facebook don't answer browsers' requests, so
their links can't be checked this way.

Hosts are matched without `www.`/`m.`; handles are lowercased; queries and further path parts
are dropped. The handles are the field's `qualifiers`: a new wiki entity whose slug is taken (another
musician with the same name) gets the first free one, e.g. `doomsday-doomsdayband-musician`.

## `/web`

```ts
import '@nostr-post/plugin-links/web';
```

Defines `<np-link>`, `<np-embed>`, `<np-links-view>` and `<np-links-input>`, and registers the
plugin as `links` and `embed` with the last two. The composer and view load it by themselves for
manifests that use either id. It also registers `<np-embed>` as the link view (`registerLinkView`,
`@nostr-post/plugins/entities`) for links with a player, so a post's or comment's YouTube link
shows as the player.

- `<np-link>`: one link (`.url`, or `.entry` with a label, icon and description), as its rule
  says.
  - Next to it, a ⋯ menu (`<np-menu-button>` of `@nostr-post/ui`): QR code (full screen), Copy
    link, Share (where the system has a share sheet) and Open. `hide-menu` leaves it out.
  - With `card`, a card of one shape: icon, name, a line under it (the description, else the link),
    then the link.
  - `.field` gives its rules; `.rules` overrides them.
  - Parts: `card`, `link`, `button`, `menu`.
- `<np-embed>`: one link as a player.
  - A "▶ Play on …" button comes first: the player, and with it the provider, loads only when
    asked. `autoplay-load` loads it right away.
  - The link shows under the player: `show-url="false"` / `.showUrl = false` hides it; unset,
    `showsUrl` decides.
  - Links without a player show as links.
- `<np-links-view>`: a field's links as `<np-link>`s; cards with `metadata.layout: 'cards'` or
  `grid-items`, which also makes them items of the parent's grid (a view's `viewLayout: 'cards'`).
- `<np-links-input>`: each link as its preview with Edit and Remove.
  - Edit shows its text box: `https://` may be left out, and pasted embed code becomes its link.
  - "Label and description" opens its label, icon and description boxes.
  - "Add link" adds a link with `metadata.multiple`.
  - A Bandcamp page link gets a hint to paste the embed code instead.

They take `messages` (`Partial<LinksMessages>`, defaults in `DEFAULT_LINKS_MESSAGES`) for
translations.
