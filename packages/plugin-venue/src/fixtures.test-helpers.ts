import type { NostrPostManifest } from '@nostr-post/core/types';
import type { VenueData } from './core';
import type { OsmElement } from './osm';

/** A trimmed venue-entity-v1 */
export const venueManifest = {
  id: 'venue-entity-test',
  version: '1.0.0',
  wikiConfig: { titleTemplate: '{name} ({city})', dTagTemplate: '{name}-{city}-(venue)' },
  fields: [
    {
      id: 'name',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: 30818, target: 'table' },
      metadata: { label: 'Name', sources: { osm: '@name' } },
    },
    {
      id: 'category',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30818, target: 'tag', tagName: 't' },
      metadata: { sources: { osm: 'amenity|shop' } },
    },
    {
      id: 'street',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30818, target: 'table' },
      metadata: { label: 'Street', sources: { osm: '@street' } },
    },
    {
      id: 'city',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30818, target: 'table' },
      metadata: { label: 'City', sources: { osm: '@city' } },
    },
    {
      id: 'website',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30818, target: 'table' },
      metadata: { label: 'Website', sources: { osm: 'website|contact:website' } },
    },
    {
      id: 'description',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 30818, target: 'content' },
    },
  ],
} as unknown as NostrPostManifest;

export const venue: VenueData = {
  geohash: 'u2fkbn',
  lat: 50.08,
  lon: 14.42,
  name: 'Café Louvre, Národní, Prague',
  osmType: 'node',
  osmId: '123',
  address: { street: 'Národní', houseNumber: '22', city: 'Prague' },
};

export const osm = (version: number, tags: Record<string, string> = {}): OsmElement => ({
  type: 'node',
  id: 123,
  version,
  tags: { name: 'Café Louvre', amenity: 'cafe', website: 'https://cafelouvre.cz', ...tags },
});
