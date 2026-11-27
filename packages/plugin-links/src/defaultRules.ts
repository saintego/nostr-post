/**
 * @nostr-post/plugin-links - The built-in rules: how links show
 *
 * Plain JSON-compatible data (see `LinkRule` in `rules.ts`). The first rule a link matches
 * decides its format: players of YouTube, Spotify, SoundCloud, Vimeo and Bandcamp (`embed`),
 * tip sites as their own buttons (`button`), payment and Nostr URIs as QR codes (`qr`), and
 * Bandcamp pages as plain links named Bandcamp. Apps put their rules before these
 * (`configureLinks({ rules })`), and fields theirs (`metadata.rules`).
 */

import type { LinkRule } from './rules';

const YOUTUBE_HOST = '(?:www\\.|m\\.|music\\.)?youtube(?:-nocookie)?\\.com';
const YOUTUBE_EMBED = 'https://www.youtube-nocookie.com/embed/{id}';

export const DEFAULT_LINK_RULES: readonly LinkRule[] = [
  // Players
  {
    id: 'youtube-short-link',
    match: '^https?://youtu\\.be/(?<id>[\\w-]{6,})(?:[?#/]|$)',
    format: 'embed',
    provider: 'youtube',
    name: 'YouTube',
    src: YOUTUBE_EMBED,
  },
  {
    id: 'youtube-watch',
    match: `^https?://${YOUTUBE_HOST}/watch\\?(?:[^#]*&)?v=(?<id>[\\w-]{6,})(?:[&#]|$)`,
    format: 'embed',
    provider: 'youtube',
    name: 'YouTube',
    src: YOUTUBE_EMBED,
  },
  {
    id: 'youtube-video',
    match: `^https?://${YOUTUBE_HOST}/(?:embed|shorts|live)/(?<id>[\\w-]{6,})(?:[?#/]|$)`,
    format: 'embed',
    provider: 'youtube',
    name: 'YouTube',
    src: YOUTUBE_EMBED,
  },
  {
    id: 'youtube-playlist',
    match: `^https?://${YOUTUBE_HOST}/playlist\\?(?:[^#]*&)?list=(?<list>[\\w-]+)`,
    format: 'embed',
    provider: 'youtube',
    name: 'YouTube',
    src: 'https://www.youtube-nocookie.com/embed/videoseries?list={list|uri}',
  },
  {
    id: 'spotify-single',
    match:
      '^https?://open\\.spotify\\.com/(?:intl-[\\w-]+/)?(?:embed/)?(?<type>track|episode)/(?<id>\\w+)',
    format: 'embed',
    provider: 'spotify',
    name: 'Spotify',
    src: 'https://open.spotify.com/embed/{type}/{id}',
    height: 152,
  },
  {
    id: 'spotify-list',
    match:
      '^https?://open\\.spotify\\.com/(?:intl-[\\w-]+/)?(?:embed/)?(?<type>album|playlist|artist|show)/(?<id>\\w+)',
    format: 'embed',
    provider: 'spotify',
    name: 'Spotify',
    src: 'https://open.spotify.com/embed/{type}/{id}',
    height: 352,
  },
  {
    id: 'soundcloud-set',
    match: '^https?://(?:www\\.|m\\.)?soundcloud\\.com/(?<path>[^/?#]+/sets/[^?#]+)',
    format: 'embed',
    provider: 'soundcloud',
    name: 'SoundCloud',
    src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2F{path|uri}&visual=false',
    height: 450,
  },
  {
    id: 'soundcloud-track',
    match: '^https?://(?:www\\.|m\\.)?soundcloud\\.com/(?<path>[^/?#]+/[^?#]+)',
    format: 'embed',
    provider: 'soundcloud',
    name: 'SoundCloud',
    src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2F{path|uri}&visual=false',
    height: 166,
  },
  {
    id: 'vimeo',
    match: '^https?://(?:www\\.)?vimeo\\.com/(?<id>\\d+)',
    format: 'embed',
    provider: 'vimeo',
    name: 'Vimeo',
    src: 'https://player.vimeo.com/video/{id}',
  },
  // Bandcamp's players need the album or track number, which only its own player links have
  {
    id: 'bandcamp-track',
    match: '^https?://(?:www\\.)?bandcamp\\.com/EmbeddedPlayer/(?!.*album=).*track=',
    format: 'embed',
    provider: 'bandcamp',
    name: 'Bandcamp',
    src: '{url}',
    height: 120,
  },
  {
    id: 'bandcamp-album',
    match: '^https?://(?:www\\.)?bandcamp\\.com/EmbeddedPlayer/',
    format: 'embed',
    provider: 'bandcamp',
    name: 'Bandcamp',
    src: '{url}',
    height: 472,
  },
  {
    id: 'bandcamp-page',
    match: '^https?://(?:[\\w-]+\\.)?bandcamp\\.com/',
    format: 'link',
    provider: 'bandcamp',
    name: 'Bandcamp',
  },
  // Tip sites, as buttons in their own colours
  {
    id: 'buymeacoffee',
    match: '^https://(?:www\\.)?(?:buymeacoffee\\.com|coff\\.ee)/',
    format: 'button',
    name: 'Buy Me a Coffee',
    icon: '☕',
    brand: { background: '#ffdd00', color: '#000000' },
  },
  {
    id: 'github-sponsors',
    match: '^https://(?:www\\.)?github\\.com/sponsors/',
    format: 'button',
    name: 'GitHub Sponsors',
    icon: '💜',
    brand: { background: '#bf3989', color: '#ffffff' },
  },
  {
    id: 'ko-fi',
    match: '^https://(?:www\\.)?ko-fi\\.com/',
    format: 'button',
    name: 'Ko-fi',
    icon: '☕',
    brand: { background: '#29abe0', color: '#ffffff' },
  },
  {
    id: 'patreon',
    match: '^https://(?:www\\.)?patreon\\.com/',
    format: 'button',
    name: 'Patreon',
    icon: '🎨',
    brand: { background: '#ff424d', color: '#ffffff' },
  },
  {
    id: 'liberapay',
    match: '^https://(?:www\\.)?liberapay\\.com/',
    format: 'button',
    name: 'Liberapay',
    icon: '🤝',
    brand: { background: '#f6c915', color: '#1a171b' },
  },
  {
    id: 'opencollective',
    match: '^https://(?:www\\.)?opencollective\\.com/',
    format: 'button',
    name: 'Open Collective',
    icon: '🤝',
    brand: { background: '#1f87ff', color: '#ffffff' },
  },
  {
    id: 'paypal',
    match: '^https://(?:www\\.)?paypal\\.me/',
    format: 'button',
    name: 'PayPal',
    icon: '💳',
    brand: { background: '#003087', color: '#ffffff' },
  },
  // URIs apps on another phone open: shown as QR codes
  {
    id: 'scan-uri',
    match: '^(?:bitcoin|lightning|nostr):',
    format: 'qr',
  },
];
