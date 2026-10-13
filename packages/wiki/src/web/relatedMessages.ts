/** User-facing text of <nostr-wiki-related> (overridable via its `messages` property) */
export interface WikiRelatedMessages {
  loading: string;
  /** A section with nothing in it */
  empty: string;
  showMore: string;
  /** Author and date of a listed post */
  byline: (author: string, date: string) => string;
}

export const DEFAULT_WIKI_RELATED_MESSAGES: WikiRelatedMessages = {
  loading: 'Loading…',
  empty: 'Nothing yet',
  showMore: 'Show more',
  byline: (author, date) => `${author} · ${date}`,
};
