/**
 * Checking the links an AI read from a post: AIs make links up, so only links the post's text
 * has are kept (the same profile counts, however it's written: `instagram.com/x`, `@x`, …).
 * Others that can be checked (Spotify, SoundCloud, YouTube videos) are set aside for that
 * (`toCheck`, see `suggestedLinks`): the user confirms the ones whose provider knows them by the
 * performer's name. With a poster, the rest may come from the image: they're kept, but listed for
 * the user to check (`fromPoster`).
 */

import { checkLink, isCheckableLink, namesMatch, profileLink } from '../../nostr-post.js';

/** Links in text, with or without `https://` */
const URL_IN_TEXT = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi;
/** `@handle` mentions (Instagram, as posts usually mean them) */
const MENTION = /(?:^|[^\w.@])@([\w.]{2,30})/g;

/** One key per link target: a profile's canonical URL, else the link without scheme and `www.` */
const keyOf = (link) =>
  profileLink(link)?.url ??
  link
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#]+$/, '')
    .toLowerCase();

const isLink = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** The keys of the links and mentions in a post's text */
export const linksInText = (text) => {
  const keys = new Set();
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
 * removed (null in objects). Removed links that can be checked are listed in `toCheck`. With a
 * poster, the others are kept and listed in `fromPoster`.
 */
export function checkLinks(json, text, hasPoster, confirmed = []) {
  const known = linksInText(text ?? '');
  const fromPoster = [];
  const toCheck = [];
  const keep = (link) => {
    if (known.has(keyOf(link)) || confirmed.includes(link)) return link;
    if (isCheckableLink(link)) {
      toCheck.push(link);
      return undefined;
    }
    if (!hasPoster) return undefined;
    fromPoster.push(link);
    return link;
  };
  const walk = (value) => {
    if (isLink(value)) return keep(value);
    if (Array.isArray(value)) return value.map(walk).filter((item) => item !== undefined);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v) ?? null]));
    }
    return value;
  };
  return { value: walk(json), fromPoster, toCheck };
}

/**
 * The links the AI gave performers that the post doesn't have, and that their provider knows by
 * the performer's name: `{ name, link, names }` (`names`: what the provider calls it). Asks
 * Spotify, SoundCloud or YouTube about each link.
 */
export async function suggestedLinks(json, text) {
  const { toCheck } = checkLinks(json, text, false);
  const performers = Array.isArray(json?.performers) ? json.performers : [];
  const candidates = performers.flatMap((p) =>
    (Array.isArray(p?.media) ? p.media : [])
      .filter((link) => toCheck.includes(link))
      .map((link) => ({ name: String(p.title ?? ''), link }))
  );
  const checked = await Promise.all(
    candidates.map(async (c) => ({ ...c, check: await checkLink(c.link) }))
  );
  return checked.flatMap(({ name, link, check }) =>
    check.status === 'found' && namesMatch(name, check.names)
      ? [{ name, link, names: check.names }]
      : []
  );
}
