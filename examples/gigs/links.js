/**
 * Checking the links an AI read from a post: AIs make links up, so only links the post's text
 * has are kept (the same profile counts, however it's written: `instagram.com/x`, `@x`, …). With
 * a poster, links not in the text may come from the image: they're kept, but listed for the user
 * to check (`fromPoster`).
 */

import { profileLink } from '../../nostr-post.js';

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
 * The AI's JSON with only the links the post has: links not in `text` are removed (null in
 * objects), unless there's a poster: then they're kept and listed in `fromPoster`
 */
export function checkLinks(json, text, hasPoster) {
  const known = linksInText(text ?? '');
  const fromPoster = [];
  const walk = (value) => {
    if (isLink(value)) {
      if (known.has(keyOf(value))) return value;
      if (!hasPoster) return undefined;
      fromPoster.push(value);
      return value;
    }
    if (Array.isArray(value)) return value.map(walk).filter((item) => item !== undefined);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v) ?? null]));
    }
    return value;
  };
  return { value: walk(json), fromPoster };
}
