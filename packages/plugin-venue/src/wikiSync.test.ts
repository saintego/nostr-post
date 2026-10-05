import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('./osm', () => ({ fetchOsmElement: vi.fn() }));
vi.mock('@nostr-post/signer', () => ({
  fetchEvents: vi.fn(),
  signEvent: vi.fn(async (event: object) => ({ ...event, id: 'new', pubkey: 'me', sig: 'sig' })),
  publishToRelays: vi.fn(async () => ({ success: 1, failed: 0, results: [] })),
  getPublishRelays: vi.fn(async (_pk: string, relays: string[]) => relays),
}));
vi.mock('@nostr-post/wiki', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nostr-post/wiki')>()),
  fetchEntityVersions: vi.fn(async () => []),
  checkEntityDTag: vi.fn(async () => 'free'),
}));

import { fetchEvents, signEvent } from '@nostr-post/signer';
import { checkEntityDTag, fetchEntityVersions, registerEntityManifest } from '@nostr-post/wiki';
import { osm, venue, venueManifest } from './fixtures.test-helpers';
import { fetchOsmElement } from './osm';
import { syncVenueEntity } from './wikiSync';

const field = {
  id: 'venue',
  type: 'geo',
  uiPlugin: 'venue',
  metadata: { wikiEntity: 'venue-entity-test' },
} as never;

const existing = (version: number, extra: string[][] = []) => ({
  id: 'old',
  pubkey: 'them',
  sig: 's',
  kind: 30818,
  created_at: 1,
  content: 'Community text about the café.',
  tags: [
    ['d', 'cafe-louvre-prague-venue'],
    ['title', 'Café Louvre (Prague)'],
    ['i', 'osm:node:123'],
    ['source', 'OpenStreetMap', 'https://www.openstreetmap.org/copyright', `node/123/v${version}`],
    ...extra,
  ],
});

const signedTags = () => (signEvent as Mock).mock.calls[0]?.[0]?.tags as string[][];

describe('syncVenueEntity', () => {
  beforeEach(() => {
    registerEntityManifest(venueManifest);
    vi.clearAllMocks();
    (fetchOsmElement as Mock).mockResolvedValue(osm(5));
    (fetchEvents as Mock).mockResolvedValue([]);
    (fetchEntityVersions as Mock).mockResolvedValue([]);
    (checkEntityDTag as Mock).mockResolvedValue('free');
  });

  it('creates a missing entity from OSM and links the post to it', async () => {
    const tags = await syncVenueEntity(venue, field);
    expect(tags).toEqual([['a', '30818:me:café-louvre-prague-venue']]);
    const created = signedTags();
    expect(created).toContainEqual(['d', 'café-louvre-prague-venue']);
    expect(created).toContainEqual(['title', 'Café Louvre (Prague)']);
    expect(created).toContainEqual(['i', 'osm:node:123']);
    expect(created).toContainEqual(['g', 'u2']);
    expect(created).toContainEqual(['t', 'cafe']);
    expect(created).toContainEqual([
      'source',
      'OpenStreetMap',
      'https://www.openstreetmap.org/copyright',
      'node/123/v5',
    ]);
  });

  it('adds the street when another venue has the slug', async () => {
    (checkEntityDTag as Mock).mockImplementation(async (d: string) =>
      d === 'café-louvre-prague-venue' ? 'taken' : 'free'
    );
    await syncVenueEntity(venue, field);
    expect(signedTags()).toContainEqual(['d', 'café-louvre-národní-prague-venue']);
    expect(signedTags()).toContainEqual(['title', 'Café Louvre (Národní Prague)']);
  });

  it('only links an entity that is up to date with OSM', async () => {
    (fetchEvents as Mock).mockResolvedValue([existing(5)]);
    (fetchEntityVersions as Mock).mockResolvedValue([existing(5)]);
    const tags = await syncVenueEntity(venue, field);
    expect(tags).toEqual([['a', '30818:them:cafe-louvre-prague-venue']]);
    expect(signEvent).not.toHaveBeenCalled();
  });

  it('updates OSM fields when OSM changed, keeping community text and other IDs', async () => {
    const old = existing(3, [['i', 'gplace:abc']]);
    (fetchEvents as Mock).mockResolvedValue([old]);
    (fetchEntityVersions as Mock).mockResolvedValue([old]);
    (fetchOsmElement as Mock).mockResolvedValue(osm(5, { website: 'https://new.example' }));
    await syncVenueEntity(venue, field);
    const event = (signEvent as Mock).mock.calls[0][0];
    expect(event.content).toContain('Community text about the café.');
    expect(event.content).toContain('https://new.example');
    expect(event.tags).toContainEqual(['d', 'cafe-louvre-prague-venue']);
    expect(event.tags).toContainEqual(['i', 'gplace:abc']);
    expect(event.tags.filter((t: string[]) => t[0] === 'source')).toEqual([
      ['source', 'OpenStreetMap', 'https://www.openstreetmap.org/copyright', 'node/123/v5'],
    ]);
  });

  it('does nothing when the user opted out', async () => {
    expect(await syncVenueEntity({ ...venue, syncWiki: false }, field)).toEqual([]);
    expect(signEvent).not.toHaveBeenCalled();
  });
});
