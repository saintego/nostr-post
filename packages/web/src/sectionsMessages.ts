/**
 * User-facing text of <nostr-post-sections> (a page's sections: reviews, photos, gigs…), with
 * English defaults. Apps override any of it with its `messages` property (e.g. translations).
 */
export interface SectionsMessages {
  loading: string;
  /** A section with nothing in it */
  empty: string;
  showMore: string;
  /** A section's "Add" button, e.g. "Add" next to "Reviews" */
  add: (sectionLabel: string) => string;
  close: string;
  /** "Add" queued the post in the outbox: its files upload later, then it's published */
  queued: string;
  /** The "Add" composer couldn't be loaded */
  noComposer: string;
  /** Above the pages "Add" can link too (`add.also`), e.g. the venue of a gig */
  alsoShowOn: string;
  /** Author and date of a listed post */
  byline: (author: string, date: string) => string;
  /** A section's numbers: posts, and the average of its stats tag (e.g. the rating) */
  stats: (count: number, average: number | undefined, max: number | undefined) => string;
}

export const DEFAULT_SECTIONS_MESSAGES: SectionsMessages = {
  loading: 'Loading…',
  empty: 'Nothing yet',
  showMore: 'Show more',
  add: () => 'Add',
  close: 'Close',
  queued: "Your post waits in the outbox: it's published when its files upload.",
  noComposer: "The form couldn't be loaded",
  alsoShowOn: 'Also show on',
  byline: (author, date) => `${author} · ${date}`,
  stats: (count, average, max) =>
    average === undefined
      ? `${count} in total`
      : `${count} in total · ★ ${average.toFixed(1)}${max ? ` / ${max}` : ''}`,
};
