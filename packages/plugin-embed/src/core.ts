/**
 * @nostr-post/plugin-embed - Core
 *
 * Players for links: a YouTube, Spotify, SoundCloud, Vimeo or Bandcamp link becomes the
 * provider's embed URL, built from the link alone (no requests). Fields opt in with
 * `uiPlugin: 'embed'`; their values are links, one or several (`r` tags, for example).
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export type EmbedProvider = 'youtube' | 'spotify' | 'soundcloud' | 'vimeo' | 'bandcamp';

/** How to show a link as a player */
export interface Embed {
  provider: EmbedProvider;
  /** The iframe's URL */
  src: string;
  /** Fixed height in pixels (audio players), else a 16:9 video */
  height?: number;
}

const parseUrl = (value: string): URL | undefined => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
};

const host = (url: URL): string => url.hostname.replace(/^(www|m|music)\./, '');

const youtube = (url: URL): Embed | undefined => {
  const h = host(url);
  const list = url.searchParams.get('list');
  let id: string | undefined;
  if (h === 'youtu.be') id = url.pathname.slice(1);
  else if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
    id =
      url.searchParams.get('v') ??
      url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ??
      undefined;
    if (!id && list && url.pathname === '/playlist') {
      return {
        provider: 'youtube',
        src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`,
      };
    }
  } else return undefined;
  if (!id || !/^[\w-]{6,}$/.test(id)) return undefined;
  return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` };
};

const SPOTIFY_TYPES = ['track', 'album', 'playlist', 'artist', 'episode', 'show'];

const spotify = (url: URL): Embed | undefined => {
  if (host(url) !== 'open.spotify.com') return undefined;
  const [type, id] = url.pathname
    .split('/')
    .filter((part) => part && !part.startsWith('intl-') && part !== 'embed');
  if (!type || !id || !SPOTIFY_TYPES.includes(type) || !/^\w+$/.test(id)) return undefined;
  const single = type === 'track' || type === 'episode';
  return {
    provider: 'spotify',
    src: `https://open.spotify.com/embed/${type}/${id}`,
    height: single ? 152 : 352,
  };
};

const soundcloud = (url: URL): Embed | undefined => {
  if (host(url) !== 'soundcloud.com' || url.pathname.split('/').filter(Boolean).length < 2) {
    return undefined;
  }
  const page = `https://soundcloud.com${url.pathname}`;
  return {
    provider: 'soundcloud',
    src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(page)}&visual=false`,
    height: url.pathname.includes('/sets/') ? 450 : 166,
  };
};

const vimeo = (url: URL): Embed | undefined => {
  const id = host(url) === 'vimeo.com' ? url.pathname.match(/^\/(\d+)/)?.[1] : undefined;
  return id ? { provider: 'vimeo', src: `https://player.vimeo.com/video/${id}` } : undefined;
};

/**
 * Bandcamp's players need the album or track number, which only the page has: its own
 * player links (`bandcamp.com/EmbeddedPlayer/album=…`) embed, page links don't
 */
const bandcamp = (url: URL): Embed | undefined => {
  if (host(url) !== 'bandcamp.com' || !url.pathname.startsWith('/EmbeddedPlayer/')) {
    return undefined;
  }
  const single = url.pathname.includes('track=') && !url.pathname.includes('album=');
  return { provider: 'bandcamp', src: url.href, height: single ? 120 : 472 };
};

/** The player for a link; undefined for links without one */
export const embedFor = (link: string): Embed | undefined => {
  const url = parseUrl(link);
  if (!url) return undefined;
  return youtube(url) ?? spotify(url) ?? soundcloud(url) ?? vimeo(url) ?? bandcamp(url);
};

/** The provider's name for a link (also for Bandcamp pages, which get no player), else undefined */
export const linkProvider = (link: string): EmbedProvider | undefined => {
  const url = parseUrl(link);
  if (!url) return undefined;
  if (url.hostname.endsWith('.bandcamp.com') || host(url) === 'bandcamp.com') return 'bandcamp';
  return embedFor(link)?.provider;
};

/** The links in a field's value: one link or a list */
export const linksOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && parseUrl(v) !== undefined
  );

// ── Plugin definition ───────────────────────────────────────────────

export const embedPlugin: NostrUIPlugin = {
  id: 'embed',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const items = Array.isArray(value) ? value : [value];
    return items.every((item) => typeof item === 'string' && parseUrl(item))
      ? { success: true, data: undefined }
      : {
          success: false,
          error: { field: field.id, message: 'Enter a web link (https://…)', code: 'INVALID_URL' },
        };
  },

  jsonSchema: (field: PostField) => {
    const link = { type: 'string', description: 'A web link (https://…)' };
    return field.metadata?.multiple === true ? { type: 'array', items: link } : link;
  },

  formatValue: (value: unknown): string => linksOf(value).join(', '),
};
