/**
 * @nostr-post/core - Text normalization
 *
 * One place for turning names into identifiers and words: NIP-54 d-tags (wiki entities), slugs
 * (list d-tags) and comparable words (finding similar titles). Identifiers made with these are
 * published, so a rule here never changes for existing callers: new needs get options.
 */

/** Accents and other combining marks removed: "Bières" → "Bieres", "Medellín" → "Medellin" */
export const foldAccents = (text: string): string => text.normalize('NFKD').replace(/\p{M}/gu, '');

export interface SlugOptions {
  /** Remove accents ("bières" → "bieres"). Default false: kept, as NIP-54 keeps letters */
  foldAccents?: boolean;
  /**
   * Other characters than letters, numbers and whitespace: `remove` them (NIP-54, "What's Up?"
   * → "whats-up", the default) or treat them as a `separate`or between words ("a.b" → "a-b")
   */
  punctuation?: 'remove' | 'separate';
}

/**
 * Lowercase words joined by `-`: whitespace becomes `-`, repeated and edge hyphens go. Letters
 * of any script and numbers are kept.
 */
export const slugify = (text: string, options: SlugOptions = {}): string => {
  const lower = text.toLowerCase();
  const letters = options.foldAccents ? foldAccents(lower) : lower;
  const spaced =
    options.punctuation === 'separate'
      ? letters.replace(/[^\p{L}\p{N}]+/gu, '-')
      : letters.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  return spaced.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
};

/**
 * A NIP-54 d-tag (wiki entity) from a title: lowercase, whitespace → `-`, punctuation and
 * symbols removed, letters of any script (with their accents) and numbers kept, no repeated or
 * edge hyphens. "Pliny the Elder" → "pliny-the-elder", "What's Up?" → "whats-up".
 */
export const nip54DTag = (title: string): string => slugify(title);

/** The lowercase words of a text, without accents and punctuation, e.g. to compare titles */
export const textWords = (text: string): string[] =>
  foldAccents(text.toLowerCase())
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
