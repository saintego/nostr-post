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
| `embedPlugin`         | The plugin: `validate` (web links only)                                            |

Players by provider:

| Provider   | Links                                                       | Player                         |
| ---------- | ----------------------------------------------------------- | ------------------------------ |
| YouTube    | `watch?v=`, `youtu.be/`, `shorts/`, `live/`, music.youtube, `playlist?list=` | `youtube-nocookie.com/embed/…` |
| Spotify    | `open.spotify.com/` track, album, playlist, artist, episode, show | `open.spotify.com/embed/…` |
| SoundCloud | `soundcloud.com/<user>/<track or sets/…>`                   | `w.soundcloud.com/player`      |
| Vimeo      | `vimeo.com/<id>`                                            | `player.vimeo.com/video/<id>`  |
| Bandcamp   | only `bandcamp.com/EmbeddedPlayer/…` links: the album or track number is only on the page | as given |

The field: `type: 'string'`, mapped to a tag such as `r`; `metadata.multiple` for several links.

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
- `<np-embed-input>`: one link per row with a preview; "Add link" with `metadata.multiple`.

They take `messages` (`Partial<EmbedMessages>`, defaults in `DEFAULT_EMBED_MESSAGES`) for
translations.
