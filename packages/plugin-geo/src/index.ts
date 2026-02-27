/**
 * @nostr-post/plugin-geo - Core entrypoint
 *
 * Import this for headless usage (validation, serialization).
 * Import '@nostr-post/plugin-geo/web' for the Leaflet map components.
 */
export {
  geoPlugin,
  encodeGeohash,
  decodeGeohash,
  type GeoPluginConfig,
  type GeoCoordinates,
} from './core';
