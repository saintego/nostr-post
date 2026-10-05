/**
 * User-facing text of the venue field's wiki-page status. Apps can override it
 * with the element's `messages` property (e.g. from a translation library).
 */
export interface VenueWikiMessages {
  /** Checkbox: publish the venue's wiki page together with the post */
  syncLabel: string;
  checking: string;
  willCreate: string;
  upToDate: (title: string) => string;
  willUpdate: (title: string) => string;
  checkFailed: string;
  osmAttribution: string;
}

export const DEFAULT_VENUE_WIKI_MESSAGES: VenueWikiMessages = {
  syncLabel: "Also create/update the venue's wiki page",
  checking: 'Checking the wiki page…',
  willCreate: 'No wiki page yet: it will be created from OpenStreetMap.',
  upToDate: (title) => `Wiki page "${title}" is up to date and will be linked.`,
  willUpdate: (title) => `OpenStreetMap changed: wiki page "${title}" will be updated.`,
  checkFailed: "Couldn't check the wiki page; it will be checked again when publishing.",
  osmAttribution: '© OpenStreetMap contributors',
};
