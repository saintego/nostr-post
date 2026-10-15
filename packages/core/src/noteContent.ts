/**
 * @nostr-post/core - Note content tokens
 *
 * Splits a kind 1 note's text into the parts other clients render inline:
 * links (images and videos shown in place), #hashtags and NIP-27 `nostr:` references.
 * Tags like `r`, `t` and `imeta` only repeat these, so a view shows the text in order
 * and skips tag values that already appear in it.
 */

import { decodeProfile } from './nip19';

export type NoteMedia = 'image' | 'video';

export type NoteToken =
  | { type: 'text'; text: string }
  | { type: 'url'; url: string; media?: NoteMedia }
  /** `tag` without the `#`, as written */
  | { type: 'hashtag'; tag: string }
  /**
   * `id` is the NIP-19 entity, e.g. `npub1…`. For `npub` and `nprofile`, `pubkey` (hex) is set
   * and `relays` holds the `nprofile`'s relay hints.
   */
  | { type: 'nostr'; uri: string; id: string; pubkey?: string; relays?: string[] };

const TOKEN_RE =
  /(https?:\/\/[^\s<>"']+)|(nostr:((?:npub|nprofile|note|nevent|naddr)1[023456789acdefghjklmnpqrstuvwxyz]+))|(?<![\w&/#])#([\w\u0080-￿][\w\u0080-￿-]*)/giu;

/** Punctuation that ends a sentence rather than the URL */
const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]}'"]+$/;

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i;

/** Media type per URL from NIP-92 `imeta` tags (`["imeta", "url …", "m image/jpeg", …]`) */
export const imetaMediaTypes = (tags: readonly string[][]): Map<string, NoteMedia> => {
  const types = new Map<string, NoteMedia>();
  for (const tag of tags) {
    if (tag[0] !== 'imeta') continue;
    const entries = tag.slice(1);
    const url = entries.find((e) => e.startsWith('url '))?.slice(4);
    const mime = entries.find((e) => e.startsWith('m '))?.slice(2) ?? '';
    if (!url) continue;
    if (mime.startsWith('video/')) types.set(url, 'video');
    else if (mime.startsWith('image/') || !mime) types.set(url, 'image');
  }
  return types;
};

const mediaType = (url: string, known: Map<string, NoteMedia>): NoteMedia | undefined => {
  const fromTags = known.get(url);
  if (fromTags) return fromTags;
  const path = url.split('#')[0] ?? url;
  if (IMAGE_EXT_RE.test(path)) return 'image';
  if (VIDEO_EXT_RE.test(path)) return 'video';
  return undefined;
};

const pushText = (tokens: NoteToken[], text: string) => {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last?.type === 'text') {
    tokens[tokens.length - 1] = { type: 'text', text: last.text + text };
  } else {
    tokens.push({ type: 'text', text });
  }
};

/**
 * Split note text into tokens. `tags` (the event's) tell which URLs are media via `imeta`;
 * other URLs are classified by file extension.
 */
export const tokenizeNoteContent = (
  content: string,
  tags: readonly string[][] = []
): NoteToken[] => {
  const known = imetaMediaTypes(tags);
  const tokens: NoteToken[] = [];
  let index = 0;
  for (const match of content.matchAll(TOKEN_RE)) {
    const start = match.index ?? 0;
    const [whole, rawUrl, uri, id, tag] = match;
    pushText(tokens, content.slice(index, start));
    index = start + whole.length;
    if (rawUrl) {
      const url = rawUrl.replace(TRAILING_PUNCTUATION_RE, '');
      index = start + url.length;
      tokens.push({ type: 'url', url, media: mediaType(url, known) });
    } else if (uri && id) {
      const entity = id.toLowerCase();
      tokens.push({ type: 'nostr', uri, id: entity, ...decodeProfile(entity) });
    } else if (tag) {
      tokens.push({ type: 'hashtag', tag });
    }
  }
  pushText(tokens, content.slice(index));
  return tokens;
};

/** Hex pubkeys the note mentions (`nostr:npub…` / `nostr:nprofile…`), without duplicates */
export const mentionedPubkeys = (tokens: readonly NoteToken[]): string[] => [
  ...new Set(tokens.flatMap((t) => (t.type === 'nostr' && t.pubkey ? [t.pubkey] : []))),
];

/** Relays the note's `nprofile` mentions suggest for finding those profiles */
export const mentionRelayHints = (tokens: readonly NoteToken[]): string[] => [
  ...new Set(tokens.flatMap((t) => (t.type === 'nostr' ? (t.relays ?? []) : []))),
];

/**
 * Whether a tag value is already shown in the note text: a URL written in it, or a
 * hashtag (`t` values are lowercase, the text may not be).
 */
export const isShownInNote = (tokens: readonly NoteToken[], value: string): boolean => {
  const lower = value.toLowerCase();
  return tokens.some(
    (t) =>
      (t.type === 'url' && t.url === value) ||
      (t.type === 'hashtag' && t.tag.toLowerCase() === lower) ||
      (t.type === 'nostr' && (t.id === lower || t.pubkey === lower))
  );
};
