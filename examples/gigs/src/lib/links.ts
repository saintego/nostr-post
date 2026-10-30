/**
 * Checking the links an AI read from a post: AIs make links up, so only links the post's text
 * has are kept (the same profile counts, however it's written: `instagram.com/x`, `@x`, …).
 * Performers' other links are offered to confirm (`suggestedLinks`): checked with their provider
 * where it can be asked (Spotify, SoundCloud, YouTube videos), else opened by the user. With a
 * poster, links may come from the image: they're kept, but listed for the user to check
 * (`fromPoster`).
 */

import { checkLink, isCheckableLink, namesMatch, profileLink } from '@nostr-post/plugin-embed';

/** Links in text, with or without `https://` */
const URL_IN_TEXT = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi;
/** `@handle` mentions (Instagram, as posts usually mean them) */
const MENTION = /(?:^|[^\w.@])@([\w.]{2,30})/g;

/** One key per link target: a profile's canonical URL, else the link without scheme and `www.` */
const keyOf = (link: string): string =>
  profileLink(link)?.url ??
  link
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#]+$/, '')
    .toLowerCase();

const isLink = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** The keys of the links and mentions in a post's text */
export const linksInText = (text: string): Set<string> => {
  const keys = new Set<string>();
  for (const [link] of text.matchAll(URL_IN_TEXT)) {
    keys.add(keyOf(/^https?:/i.test(link) ? link : `https://${link}`));
  }
  for (const [, handle] of text.matchAll(MENTION)) {
    keys.add(keyOf(`https://www.instagram.com/${handle}`));
  }
  return keys;
};

/**
 * The AI's JSON with only the links the post has, or the user `confirmed`: other links are
 * removed (null in objects). With a poster, those that can't be checked are kept and listed in
 * `fromPoster`.
 */
export function checkLinks(
  json: unknown,
  text: string,
  hasPoster: boolean,
  confirmed: string[] = []
): { value: unknown; fromPoster: string[] } {
  const known = linksInText(text);
  const fromPoster: string[] = [];
  const keep = (link: string): string | undefined => {
    if (known.has(keyOf(link)) || confirmed.includes(link)) return link;
    if (isCheckableLink(link) || !hasPoster) return undefined;
    fromPoster.push(link);
    return link;
  };
  const walk = (value: unknown): unknown => {
    if (isLink(value)) return keep(value);
    if (Array.isArray(value)) return value.map(walk).filter((item) => item !== undefined);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v) ?? null]));
    }
    return value;
  };
  return { value: walk(json), fromPoster };
}

/** A link the AI suggested for a performer; `names`: what its site calls it, when `checked` */
export interface SuggestedLink {
  name: string;
  link: string;
  names: string[];
  checked: boolean;
}

/** The AI's performers, as far as they're objects */
export const performersOf = (json: unknown): Record<string, unknown>[] => {
  const performers = (json as { performers?: unknown } | null)?.performers;
  return Array.isArray(performers)
    ? performers.filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
    : [];
};

/**
 * The links the AI gave performers that the post doesn't have. Links Spotify, SoundCloud or
 * YouTube can be asked about are checked: those their provider knows by the performer's name are
 * `checked`, and those it doesn't know, or knows by another name, are dropped. Links no one can be
 * asked about (YouTube channels, Bandcamp, Instagram, Facebook, websites) are kept unchecked, for
 * the user to open and confirm; with a poster they're not offered (`checkLinks` keeps them as
 * read from the poster).
 */
export async function suggestedLinks(
  json: unknown,
  text: string,
  hasPoster = false
): Promise<SuggestedLink[]> {
  const known = linksInText(text);
  const candidates = performersOf(json).flatMap((p) =>
    (Array.isArray(p.media) ? p.media : [])
      .filter(isLink)
      .filter((link) => !known.has(keyOf(link)))
      .filter((link) => !hasPoster || isCheckableLink(link))
      .map((link) => ({ name: String(p.title ?? ''), link }))
  );
  const checked = await Promise.all(
    candidates.map(async (c) => ({ ...c, check: await checkLink(c.link) }))
  );
  return checked.flatMap(({ name, link, check }): SuggestedLink[] => {
    if (check.status === 'unknown') return [{ name, link, names: [], checked: false }];
    return check.status === 'found' && namesMatch(name, check.names)
      ? [{ name, link, names: check.names, checked: true }]
      : [];
  });
}
