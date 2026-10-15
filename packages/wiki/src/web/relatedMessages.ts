/** User-facing text of <nostr-wiki-related> (overridable via its `messages` property) */
export interface WikiRelatedMessages {
  loading: string;
  /** A section with nothing in it */
  empty: string;
  showMore: string;
  /** Author and date of a listed post */
  byline: (author: string, date: string) => string;
  /** A section's numbers: posts, and the average of its stats tag (e.g. the rating) */
  stats: (count: number, average: number | undefined, max: number | undefined) => string;
}

export const DEFAULT_WIKI_RELATED_MESSAGES: WikiRelatedMessages = {
  loading: 'Loading…',
  empty: 'Nothing yet',
  showMore: 'Show more',
  byline: (author, date) => `${author} · ${date}`,
  stats: (count, average, max) =>
    average === undefined
      ? `${count} in total`
      : `${count} in total · ★ ${average.toFixed(1)}${max ? ` / ${max}` : ''}`,
};
