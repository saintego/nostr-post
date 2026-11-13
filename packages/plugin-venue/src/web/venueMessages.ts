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
  /** For a new page of a venue from OSM: its Google Maps link */
  googleLinkLabel: string;
  googleLinkPlaceholder: string;
  /** The pasted text isn't a Google Maps link to a place */
  googleLinkInvalid: string;
  /** A short Google Maps share link that couldn't be looked up (no key from the app, or not found) */
  googleShortLink: string;
  /** While a short link's place is looked up on Google */
  googleShortLooking: string;
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
  googleLinkLabel: 'Google Maps link (optional):',
  googleLinkPlaceholder: 'https://www.google.com/maps/place/…',
  googleLinkInvalid:
    "Not a Google Maps link to a place: open the place on Google Maps and copy the address bar's link.",
  googleShortLink:
    'Short links can only be opened by Google: open it, then paste the full link from the address bar (or add a Google key in the app to look them up).',
  googleShortLooking: 'Looking it up on Google…',
};

/** User-facing text of <np-venue-view> (overridable via its `messages` property) */
export interface VenueViewMessages {
  viewOnOsm: string;
  googleMaps: string;
  /** Summary of the collapsible wiki page of the venue */
  wikiPage: string;
  /** While the page of a venue the post doesn't link is looked up by the venue's ids */
  wikiPageLooking: string;
  /** No page found for the venue */
  wikiPageNone: string;
  /** Summary of Google's place card (shown when the app set a Maps Embed key) */
  googleCard: string;
}

export const DEFAULT_VENUE_VIEW_MESSAGES: VenueViewMessages = {
  viewOnOsm: 'View on OSM ↗',
  googleMaps: 'Google Maps ↗',
  wikiPage: 'Venue wiki page',
  wikiPageLooking: 'Looking for its page…',
  wikiPageNone: 'No wiki page for this place yet',
  googleCard: 'On Google Maps',
};

/** User-facing text of <np-venue-input> (overridable via its `messages` property) */
export interface VenueInputMessages {
  /** Search box placeholder for the levels the field offers */
  searchPlaceholder: (levels: VenueLevel[]) => string;
  search: string;
  searching: string;
  /** Badge on a search result */
  levelLabel: Record<VenueLevel, string>;
  /** A short Google Maps share link, and the app gave no Google key to look it up */
  googleShortLink: string;
  /** A short link pasted without its share text: the place's name is needed to search */
  googleShortName: string;
  googleShortNamePlaceholder: string;
  googleShortFind: string;
  /** While a short link's place is looked up on Google */
  googleShortSearching: string;
  /** Google found several places for a short link: the author picks one */
  googleShortPick: string;
  /** Google didn't find a short link's place */
  googleShortNotFound: (name: string) => string;
  /** A pasted Google Maps link whose place isn't found on OpenStreetMap around its point */
  googleNotOnOsm: (name: string | undefined) => string;
  /** Not found at the link's point, but places with its name in the area */
  googleNearby: (name: string | undefined) => string;
  /** Searching by name after pasting a Google Maps link */
  googleLinkKept: string;
  /** The picked venue's card: remove it */
  clearVenue: string;
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
    'Short links can only be opened by Google: open it, then paste the full link from the address bar (or add a Google key in the app to look them up).',
  googleShortName: "This link has no name with it: type the place's name to find it on Google.",
  googleShortNamePlaceholder: 'Name of the place',
  googleShortFind: 'Find',
  googleShortSearching: 'Looking it up on Google…',
  googleShortPick: 'Which place is it?',
  googleShortNotFound: (name) =>
    `"${name}" wasn't found on Google: search for it by name, or click its spot on the map.`,
  googleNotOnOsm: (name) =>
    `${name ? `"${name}" wasn't` : "This place wasn't"} found on OpenStreetMap around the link's spot: search for it by name (the Google link is kept), or click its spot on the map.`,
  googleNearby: (name) =>
    `Not found at the link's spot, but ${name ? `"${name}"` : 'places with its name'} nearby on OpenStreetMap: pick it if it's the same place, search by name, or click its spot on the map.`,
  googleLinkKept:
    'The Google Maps link goes with the place you pick (clear the search to drop it).',
  clearVenue: 'Clear venue info',
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
