/**
 * Checking the links an AI read from a post: AIs make links up, so only links the post's text
 * has are kept (the same profile counts, however it's written: `instagram.com/x`, `@x`, …).
 * Performers' other links are offered to confirm (`suggestedLinks`): checked with their provider
 * where it can be asked (Spotify, SoundCloud, YouTube videos), else opened by the user. With a
 * poster, links may come from the image: they're kept, but listed for the user to check
 * (`fromPoster`).
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
 * removed (null in objects). With a poster, those that can't be checked are kept and listed in
 * `fromPoster`.
 */
export function checkLinks(json, text, hasPoster, confirmed = []) {
  const known = linksInText(text ?? '');
  const fromPoster = [];
  const keep = (link) => {
    if (known.has(keyOf(link)) || confirmed.includes(link)) return link;
    if (isCheckableLink(link) || !hasPoster) return undefined;
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
  return { value: walk(json), fromPoster };
}

/**
 * The links the AI gave performers that the post doesn't have: `{ name, link, names, checked }`.
 * Links Spotify, SoundCloud or YouTube can be asked about are checked: those their provider knows
 * by the performer's name are `checked` (`names`: what the provider calls it), and those it doesn't
 * know, or knows by another name, are dropped. Links no one can be asked about (YouTube channels,
 * Bandcamp, Instagram, Facebook, websites) are kept unchecked, for the user to open and confirm;
 * with a poster they're not offered (`checkLinks` keeps them as read from the poster).
 */
export async function suggestedLinks(json, text, hasPoster = false) {
  const known = linksInText(text ?? '');
  const performers = Array.isArray(json?.performers) ? json.performers : [];
  const candidates = performers.flatMap((p) =>
    (Array.isArray(p?.media) ? p.media : [])
      .filter((link) => isLink(link) && !known.has(keyOf(link)))
      .filter((link) => !hasPoster || isCheckableLink(link))
      .map((link) => ({ name: String(p.title ?? ''), link }))
  );
  const checked = await Promise.all(
    candidates.map(async (c) => ({ ...c, check: await checkLink(c.link) }))
  );
  return checked.flatMap(({ name, link, check }) => {
    if (check.status === 'unknown') return [{ name, link, names: [], checked: false }];
    return check.status === 'found' && namesMatch(name, check.names)
      ? [{ name, link, names: check.names, checked: true }]
      : [];
  });
}
