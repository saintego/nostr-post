/**
 * @nostr-post/plugin-embed - Profile links
 *
 * Links to someone's profile on a platform (a Bandcamp, Instagram, SoundCloud, Facebook or
 * YouTube page, a Spotify artist), in one canonical form per profile: the same profile linked as
 * `http://m.facebook.com/Band/?ref=x` or `https://www.facebook.com/band` gives one URL. Written as
 * NIP-73 `i` tags, they identify who an event or a wiki page is about, so relays can find
 * everything that links the same profile (`#i`). No DOM dependencies.
 */

/** A profile link's platform */
export type ProfilePlatform =
  | 'bandcamp'
  | 'spotify'
  | 'soundcloud'
  | 'instagram'
  | 'facebook'
  | 'youtube';

/** A profile link in its canonical form */
export interface ProfileLink {
  platform: ProfilePlatform;
  /** The canonical URL, e.g. `https://www.instagram.com/doomsday` */
  url: string;
  /** The profile's readable name on the platform (lowercase), if it has one, e.g. `doomsday` */
  handle?: string;
}

const parse = (value: string): URL | undefined => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
};

const HANDLE = /^[\w.-]+$/;

/** First path segments that are a platform's own pages, not a profile */
const NOT_PROFILES: Record<'soundcloud' | 'instagram' | 'facebook', string[]> = {
  soundcloud: ['discover', 'search', 'stream', 'you', 'upload', 'charts', 'pages', 'tags'],
  instagram: ['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'direct'],
  facebook: [
    'events',
    'groups',
    'pages',
    'watch',
    'share',
    'sharer',
    'photo',
    'photos',
    'story.php',
    'permalink.php',
    'login',
    'marketplace',
    'hashtag',
  ],
};

const byHandle = (
  platform: 'soundcloud' | 'instagram' | 'facebook',
  base: string,
  segment: string | undefined
): ProfileLink | undefined => {
  const handle = segment?.toLowerCase();
  if (!handle || !HANDLE.test(handle) || NOT_PROFILES[platform].includes(handle)) return undefined;
  return { platform, url: `${base}/${handle}`, handle };
};

const facebook = (url: URL, first: string | undefined): ProfileLink | undefined => {
  if (first === 'profile.php') {
    const id = url.searchParams.get('id');
    return id && /^\d+$/.test(id)
      ? { platform: 'facebook', url: `https://www.facebook.com/profile.php?id=${id}` }
      : undefined;
  }
  return byHandle('facebook', 'https://www.facebook.com', first);
};

const youtube = (
  first: string | undefined,
  second: string | undefined
): ProfileLink | undefined => {
  if (first?.startsWith('@') && HANDLE.test(first.slice(1))) {
    const handle = first.slice(1).toLowerCase();
    return { platform: 'youtube', url: `https://www.youtube.com/@${handle}`, handle };
  }
  return first === 'channel' && second && /^[\w-]+$/.test(second)
    ? { platform: 'youtube', url: `https://www.youtube.com/channel/${second}` }
    : undefined;
};

/** The profile a link points to, in canonical form; undefined for links that aren't profiles */
export const profileLink = (link: string): ProfileLink | undefined => {
  const url = parse(link);
  if (!url) return undefined;
  const hostname = url.hostname.toLowerCase().replace(/^(www|m|web|mobile)\./, '');
  const [first, second] = url.pathname.split('/').filter(Boolean);
  const bandcamp = hostname.match(/^([a-z0-9-]+)\.bandcamp\.com$/)?.[1];
  if (bandcamp && bandcamp !== 'daily') {
    return { platform: 'bandcamp', url: `https://${bandcamp}.bandcamp.com`, handle: bandcamp };
  }
  switch (hostname) {
    case 'open.spotify.com': {
      const [type, id] = url.pathname
        .split('/')
        .filter((part) => part && !part.startsWith('intl-'));
      return type === 'artist' && id && /^\w+$/.test(id)
        ? { platform: 'spotify', url: `https://open.spotify.com/artist/${id}` }
        : undefined;
    }
    case 'soundcloud.com':
      return byHandle('soundcloud', 'https://soundcloud.com', first);
    case 'instagram.com':
      return byHandle('instagram', 'https://www.instagram.com', first);
    case 'facebook.com':
    case 'fb.com':
      return facebook(url, first);
    case 'youtube.com':
      return youtube(first, second);
    default:
      return undefined;
  }
};

/** The canonical profile URLs among `links`, without repeats */
export const profileUrls = (links: string[]): string[] => [
  ...new Set(links.flatMap((link) => profileLink(link)?.url ?? [])),
];
