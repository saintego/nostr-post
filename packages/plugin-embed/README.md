# @nostr-post/plugin-embed

Players for links in nostr-post: a field with `uiPlugin: 'embed'` shows its links as YouTube,
Spotify, SoundCloud, Vimeo or Bandcamp players, e.g. an artist's or a venue's media. Ordinary
links stay links, and fields without the plugin are untouched.

## Main entry (no UI)

```ts
import { embedFor, linkProvider, linksOf, embedPlugin } from '@nostr-post/plugin-embed';

embedFor('https://youtu.be/dQw4w9WgXcQ');
// { provider: 'youtube', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' }
```

| Export                | Does                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| `embedFor(link)`      | The player for a link: `{ provider, src, height? }` (no `height`: a 16:9 video); undefined for links without one. Built from the link alone, no requests |
| `linkProvider(link)`  | The provider of a link, also of a Bandcamp page (which gets no player)             |
| `linksOf(value)`      | The links in a field's value (one or a list)                                       |
| `embedPlugin`         | The plugin: `validate` (web links only); profile links also written as `i` tags    |
| `profileLink(link)`   | The profile a link points to, in canonical form: `{ platform, url, handle? }`, or undefined for links that aren't profiles |
| `profileUrls(links)`  | The canonical profile URLs among links, without repeats                            |
| `linkFromEmbedCode(text)` | The link in a site's embed code (`<iframe src="…">`), e.g. Bandcamp's; other text as it is |
| `isCheckableLink(link)` | Whether `checkLink` can ask about a link: Spotify, SoundCloud (profiles too), YouTube videos |
| `checkLink(link, fetch?)` | Asks the provider (oEmbed) whether the link exists: `{ status: 'found', names }` (an artist's or channel's name, a title), `missing`, or `unknown` (can't ask, or it failed). Contacts the provider |
| `namesMatch(name, names)` | Whether a check's names are this name (ignoring case, accents, punctuation; also a whole part of a title such as "Name - Live") |

Players by provider:

| Provider   | Links                                                       | Player                         |
| ---------- | ----------------------------------------------------------- | ------------------------------ |
| YouTube    | `watch?v=`, `youtu.be/`, `shorts/`, `live/`, music.youtube, `playlist?list=` | `youtube-nocookie.com/embed/…` |
| Spotify    | `open.spotify.com/` track, album, playlist, artist, episode, show | `open.spotify.com/embed/…` |
| SoundCloud | `soundcloud.com/<user>/<track or sets/…>`                   | `w.soundcloud.com/player`      |
| Vimeo      | `vimeo.com/<id>`                                            | `player.vimeo.com/video/<id>`  |
| Bandcamp   | only `bandcamp.com/EmbeddedPlayer/…` links, or Bandcamp's embed code (Share / Embed): the album or track number is only on the page, not in its link | as given |

The field: `type: 'string'`, mapped to a tag such as `r`; `metadata.multiple` for several links.

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
real one of someone else. Bandcamp, Instagram and Facebook don't answer browsers' requests, so
their links can't be checked this way.

Hosts are matched without `www.`/`m.`; handles are lowercased; queries and further path parts
are dropped. The handles are the field's `qualifiers`: a new wiki entity whose slug is taken (another
musician with the same name) gets the first free one, e.g. `doomsday-doomsdayband-musician`.

## `/web`

```ts
import '@nostr-post/plugin-embed/web';
```

Defines `<np-embed>`, `<np-embed-view>` and `<np-embed-input>` and registers the plugin with the
last two. The composer and view load it by themselves for manifests with `uiPlugin: 'embed'`.

- `<np-embed>`: one link (`.url`). A "▶ Play on …" button first: the player, and with it the
  provider, loads only when asked (`autoplay-load` loads it right away). Links without a player
  show as links.
- `<np-embed-view>`: a field's links as `<np-embed>`s.
- `<np-embed-input>`: one link per row with a preview; "Add link" with `metadata.multiple`. Pasted
  embed code becomes its link; a Bandcamp page link gets a hint to paste the embed code instead.

They take `messages` (`Partial<EmbedMessages>`, defaults in `DEFAULT_EMBED_MESSAGES`) for
translations.
