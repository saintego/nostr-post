import type { VenueLevel } from '../levels';

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

/** User-facing text of <np-venue-input> (overridable via its `messages` property) */
export interface VenueInputMessages {
  /** Search box placeholder for the levels the field offers */
  searchPlaceholder: (levels: VenueLevel[]) => string;
  search: string;
  searching: string;
  /** Badge on a search result */
  levelLabel: Record<VenueLevel, string>;
  /** A short Google Maps share link: only Google could open it */
  googleShortLink: string;
  /** A pasted Google Maps link whose place isn't on OpenStreetMap */
  googleNotOnOsm: (name: string | undefined) => string;
}

export const DEFAULT_VENUE_INPUT_MESSAGES: VenueInputMessages = {
  searchPlaceholder: (levels) =>
    levels.length === 1 && levels[0] === 'place'
      ? 'Search for a venue (OSM)…'
      : `Search for a ${levels.map((l) => DEFAULT_VENUE_INPUT_MESSAGES.levelLabel[l]).join(', ')} (OSM)…`,
  search: '🔍 Search',
  searching: 'Searching…',
  levelLabel: { country: 'country', city: 'city', place: 'place' },
  googleShortLink:
    'Short links can only be opened by Google: open it, then paste the full link from the address bar.',
  googleNotOnOsm: (name) =>
    `${name ? `"${name}" isn't` : "This place isn't"} on OpenStreetMap yet: click its spot on the map to add it.`,
};

/** User-facing text of <np-venue-entity-create> (overridable via its `messages` property) */
export interface VenueCreateMessages {
  intro: string;
  searchPlaceholder: string;
  search: string;
  searching: string;
  noResults: string;
  /** Button: create the page, or link it when it exists */
  create: string;
  creating: string;
  /** The hook linked nothing, e.g. the opt-out checkbox was unticked */
  nothingLinked: string;
}

export const DEFAULT_VENUE_CREATE_MESSAGES: VenueCreateMessages = {
  intro:
    'Find the place on OpenStreetMap: its wiki page is created from it, or linked if it exists.',
  searchPlaceholder: 'Search for a place (OSM)…',
  search: '🔍 Search',
  searching: 'Searching…',
  noResults: 'No places found',
  create: 'Create / link the wiki page',
  creating: 'Publishing…',
  nothingLinked: 'Nothing was linked: keep "Also create/update the wiki page" ticked',
};
