/**
 * The links in what an AI read from a post. The checks come from `@nostr-post/plugin-links`
 * (`keepKnownLinks`, `checkSuggestedLinks`): only links the post's text has are kept; the others
 * (performers' links, the gig's own, e.g. its tickets) are offered to confirm.
 */

import { checkSuggestedLinks, type SuggestedLink } from '@nostr-post/plugin-links';
import { GIG_MANIFEST } from './manifests';

export type { SuggestedLink };

/** The AI's performers, as far as they're objects */
export const performersOf = (json: unknown): Record<string, unknown>[] => {
  const performers = (json as { performers?: unknown } | null)?.performers;
  return Array.isArray(performers)
    ? performers.filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
    : [];
};

const isLink = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** The gig's own links in the AI's answer (e.g. `link`: its tickets), named by their field's label */
const gigLinks = (json: unknown): { name: string; link: string }[] =>
  Object.entries((json && typeof json === 'object' ? json : {}) as Record<string, unknown>)
    .filter(([key]) => key !== 'performers')
    .flatMap(([key, value]) => {
      const label = GIG_MANIFEST.fields.find((f) => f.id === key)?.metadata?.label;
      const name = typeof label === 'string' ? label : key;
      return [value]
        .flat()
        .filter(isLink)
        .map((link) => ({ name, link }));
    });

/**
 * The links the AI gave that the post doesn't have: the performers' and the gig's own, checked
 * (`checkSuggestedLinks`)
 */
export const suggestedLinks = (
  json: unknown,
  text: string,
  hasPoster = false
): Promise<SuggestedLink[]> =>
  checkSuggestedLinks(
    [
      ...gigLinks(json),
      ...performersOf(json).flatMap((p) =>
        (Array.isArray(p.media) ? p.media : []).map((link) => ({
          name: String(p.title ?? ''),
          link: String(link),
        }))
      ),
    ],
    text,
    { hasImage: hasPoster }
  );
