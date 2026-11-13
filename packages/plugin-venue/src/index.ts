/**
 * @nostr-post/plugin-venue - Core entrypoint
 *
 * Import this for headless usage (validation, serialization, search).
 * Import '@nostr-post/plugin-venue/web' for the web components.
 */
export {
  venuePlugin,
  searchNominatim,
  nominatimToVenue,
  osmIdentifier,
  googlePlaceIdentifier,
  osmUrl,
  googleMapsPlaceUrl,
  googleMapsUrl,
  type VenueData,
  type VenueAddress,
  type VenuePluginConfig,
  type NominatimResult,
} from './core';

export { geohashTags, resultLevel, type VenueLevel, venueLevels } from './levels';
export {
  configureVenuePlugin,
  googleEmbedUrl,
  googlePlacesKey,
  type VenuePluginSettings,
} from './googleEmbed';
export { type GoogleMapsLink, parseGoogleMapsUrl } from './googleLink';
export {
  type GooglePlace,
  googlePlaceIdForVenue,
  lookUpShortLink,
  nearestGooglePlace,
  placeLink,
  type ShortLinkLookup,
  searchGooglePlaces,
} from './googlePlaces';
export { fetchOsmElement, type OsmElement } from './osm';
export { type GoogleLinkProblem, googleLinkChange, lacksGoogleLink } from './venueLinks';
export { type GoogleLinkMatches, searchGoogleLink } from './googleSearch';
export {
  OSM_COPYRIGHT_URL,
  type EntitySyncAction,
  entitySyncAction,
  isSameVenueByName,
  mergeOsmFields,
  venueEntityTags,
  venueIdentifiers,
  venueToEntityData,
} from './wikiEntity';
export {
  findVenueEntity,
  findVenueEntityByName,
  planVenueEntity,
  syncVenueEntity,
} from './wikiSync';
