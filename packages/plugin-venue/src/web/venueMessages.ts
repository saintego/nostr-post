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
  /** Before the slug of a new wiki page (it can't be changed later) */
  slugLabel: string;
  slugChecking: string;
  slugFree: string;
  slugTaken: string;
  slugUnknown: string;
}

export const DEFAULT_VENUE_WIKI_MESSAGES: VenueWikiMessages = {
  syncLabel: "Also create/update the venue's wiki page",
  checking: 'Checking the wiki page…',
  willCreate: 'No wiki page yet: it will be created from OpenStreetMap.',
  upToDate: (title) => `Wiki page "${title}" is up to date and will be linked.`,
  willUpdate: (title) => `OpenStreetMap changed: wiki page "${title}" will be updated.`,
  checkFailed: "Couldn't check the wiki page; it will be checked again when publishing.",
  osmAttribution: '© OpenStreetMap contributors',
  slugLabel: 'Wiki page slug (permanent):',
  slugChecking: 'checking…',
  slugFree: '✓ free',
  slugTaken: '✗ used by another venue: change it, e.g. add a detail',
  slugUnknown: "? couldn't verify (a relay didn't answer)",
};

/** User-facing text of <np-venue-view> (overridable via its `messages` property) */
export interface VenueViewMessages {
  viewOnOsm: string;
  googleMaps: string;
  /** Summary of the collapsible wiki page of the venue */
  wikiPage: string;
}

export const DEFAULT_VENUE_VIEW_MESSAGES: VenueViewMessages = {
  viewOnOsm: 'View on OSM ↗',
  googleMaps: 'Google Maps ↗',
  wikiPage: 'Venue wiki page',
};
