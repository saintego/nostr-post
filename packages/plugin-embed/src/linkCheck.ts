/**
 * @nostr-post/plugin-embed - Checking that a link exists, and whose it is
 *
 * Spotify, SoundCloud and YouTube (videos) answer oEmbed requests from any site (CORS): a link
 * that doesn't exist gets 404, one that does gets its names (an artist's or channel's name, a
 * title). That tells a made-up link (e.g. one an AI suggested) from a real one, and a real one of
 * someone else with a similar name. Other sites (Bandcamp, Instagram, Facebook) can't be asked
 * from a browser. Asking contacts the provider, so apps should say so before checking.
 */

import { embedFor } from './core';

/** What a check found: the link's names, that it doesn't exist, or nothing (couldn't ask) */
export type LinkCheck =
  | { status: 'found'; names: string[] }
  | { status: 'missing' }
  | { status: 'unknown' };

const OEMBED: Record<string, (link: string) => string> = {
  spotify: (link) => `https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`,
  soundcloud: (link) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(link)}`,
  youtube: (link) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`,
};

const isSoundCloud = (link: string): boolean => {
  try {
    return new URL(link).hostname.replace(/^(www|m)\./, '') === 'soundcloud.com';
  } catch {
    return false;
  }
};

/** The oEmbed URL that checks a link, for the providers that can be asked */
const oembedUrl = (link: string): string | undefined => {
  // SoundCloud profiles (one path part) get no player, but can be checked
  const provider = isSoundCloud(link) ? 'soundcloud' : embedFor(link)?.provider;
  // YouTube's oEmbed knows videos only, not channels or playlists
  if (provider === 'youtube' && embedFor(link)?.src.includes('videoseries')) return undefined;
  return provider ? OEMBED[provider]?.(link) : undefined;
};

/** Whether `checkLink` can ask about this link (Spotify, SoundCloud, a YouTube video) */
export const isCheckableLink = (link: string): boolean => oembedUrl(link) !== undefined;

/** Asks the link's provider whether it exists, and for its names */
export async function checkLink(link: string, fetchFn: typeof fetch = fetch): Promise<LinkCheck> {
  const url = oembedUrl(link);
  if (!url) return { status: 'unknown' };
  try {
    const response = await fetchFn(url);
    if (response.status === 404 || response.status === 400) return { status: 'missing' };
    if (!response.ok) return { status: 'unknown' };
    const data = (await response.json()) as Record<string, unknown>;
    const names = [data.author_name, data.title].filter(
      (name): name is string => typeof name === 'string' && name.trim() !== ''
    );
    return { status: 'found', names };
  } catch {
    return { status: 'unknown' };
  }
}

const normalize = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Whether a check's names are this name's: one of them is the name, or has it as a whole part
 * ("Doomsday - Live at …" for "Doomsday"), ignoring case, accents, spaces and punctuation
 */
export const namesMatch = (name: string, names: string[]): boolean => {
  const wanted = normalize(name);
  if (!wanted) return false;
  return names.some((candidate) => {
    if (normalize(candidate) === wanted) return true;
    return candidate.split(/\s+[-–—|·:]\s+|[()[\]]/).some((part) => normalize(part) === wanted);
  });
};
