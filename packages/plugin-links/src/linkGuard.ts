/**
 * Guarding against made-up links, e.g. in what an AI read from a post: only links the source
 * text has are kept (the same profile counts, however it's written: `instagram.com/x`, `@x`, …).
 * Other links are offered to confirm: checked with their provider where it can be asked
 * (Spotify, SoundCloud, YouTube videos, `checkLink`), else left for the user to open. When the
 * source also had an image (a poster), links may come from it: they're kept, but listed for the
 * user to check.
 */

import { checkLink, isCheckableLink, namesMatch } from './linkCheck';
import { profileLink } from './profileLinks';

/** Links in text, with or without `https://` */
const URL_IN_TEXT = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi;
/** `@handle` mentions (Instagram, as posts usually mean them) */
const MENTION = /(?:^|[^\w.@])@([\w.]{2,30})/g;

/** One key per link target: a profile's canonical URL, else the link without scheme and `www.` */
export const linkKey = (link: string): string =>
  profileLink(link)?.url ??
  link
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#]+$/, '')
    .toLowerCase();

const isLink = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** The keys (`linkKey`) of the links and `@` mentions in a text */
export const linksInText = (text: string): Set<string> => {
  const keys = new Set<string>();
  for (const [link] of text.matchAll(URL_IN_TEXT)) {
    keys.add(linkKey(/^https?:/i.test(link) ? link : `https://${link}`));
  }
  for (const [, handle] of text.matchAll(MENTION)) {
    keys.add(linkKey(`https://www.instagram.com/${handle}`));
  }
  return keys;
};

/**
 * `value` (e.g. an AI's JSON) with only the links the source `text` has, or the user `confirmed`:
 * other links are removed (null in objects, left out of lists). With `hasImage`, links that
 * can't be checked may come from the image: they're kept and listed in `fromImage`.
 */
export function keepKnownLinks(
  value: unknown,
  text: string,
  { hasImage = false, confirmed = [] as string[] } = {}
): { value: unknown; fromImage: string[] } {
  const known = linksInText(text);
  const fromImage: string[] = [];
  const keep = (link: string): string | undefined => {
    if (known.has(linkKey(link)) || confirmed.includes(link)) return link;
    if (isCheckableLink(link) || !hasImage) return undefined;
    fromImage.push(link);
    return link;
  };
  const walk = (item: unknown): unknown => {
    if (isLink(item)) return keep(item);
    if (Array.isArray(item)) return item.map(walk).filter((v) => v !== undefined);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, walk(v) ?? null]));
    }
    return item;
  };
  return { value: walk(value), fromImage };
}

/**
 * A link suggested for someone. `checked`: its site knows it by their name; else `names` are
 * what its site calls it (someone else, or them by another name), or empty when it couldn't be
 * asked
 */
export interface SuggestedLink {
  name: string;
  link: string;
  names: string[];
  checked: boolean;
}

/**
 * Links suggested for people (`{ name, link }`) that the source `text` doesn't have. Links a
 * provider can be asked about are checked: those it knows by the person's name are `checked`,
 * those it knows by another name are kept unchecked with that name (for the user to decide),
 * those it doesn't know are dropped. The others are kept unchecked, for the user to open and
 * confirm; with `hasImage` they're not offered (`keepKnownLinks` keeps them as read from the
 * image). Contacts the providers.
 */
export async function checkSuggestedLinks(
  candidates: { name: string; link: string }[],
  text: string,
  { hasImage = false, fetchFn }: { hasImage?: boolean; fetchFn?: typeof fetch } = {}
): Promise<SuggestedLink[]> {
  const known = linksInText(text);
  const fresh = candidates.filter(
    ({ link }) => isLink(link) && !known.has(linkKey(link)) && (!hasImage || isCheckableLink(link))
  );
  const checked = await Promise.all(
    fresh.map(async (c) => ({ ...c, check: await checkLink(c.link, fetchFn) }))
  );
  return checked.flatMap(({ name, link, check }): SuggestedLink[] => {
    if (check.status === 'unknown') return [{ name, link, names: [], checked: false }];
    if (check.status === 'missing') return [];
    return [{ name, link, names: check.names, checked: namesMatch(name, check.names) }];
  });
}
