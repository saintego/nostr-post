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
  type VenuePluginConfig,
  type NominatimResult,
} from './core';
