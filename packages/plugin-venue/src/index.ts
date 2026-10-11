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

export { fetchOsmElement, type OsmElement } from './osm';
export {
  OSM_COPYRIGHT_URL,
  type EntitySyncAction,
  entitySyncAction,
  mergeOsmFields,
  venueEntityTags,
  venueIdentifiers,
  venueToEntityData,
} from './wikiEntity';
export { findVenueEntity, planVenueEntity, syncVenueEntity } from './wikiSync';
