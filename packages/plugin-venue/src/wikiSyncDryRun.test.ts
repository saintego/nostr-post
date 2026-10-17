// @vitest-environment happy-dom
/**
 * The venue hub with the real signer in test mode (dry-run): relays only answer
 * EOSE, so what the hub finds is what the dry-run log holds.
 */
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./osm', () => ({ fetchOsmElement: vi.fn() }));

import { clearDryRunEntries, getDryRunEntries, setDryRun } from '@nostr-post/signer';
import { registerEntityManifest } from '@nostr-post/wiki';
import { osm, venue, venueManifest } from './fixtures.testHelpers';
import { fetchOsmElement } from './osm';
import { syncVenueEntity } from './wikiSync';

/** A relay that answers every REQ with EOSE */
class EmptyRelay {
  onopen?: () => void;
  onmessage?: (message: { data: string }) => void;
  onerror?: () => void;
  constructor() {
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data: string) {
    const [type, subId] = JSON.parse(data) as [string, string];
    if (type !== 'REQ') return;
    setTimeout(() => this.onmessage?.({ data: JSON.stringify(['EOSE', subId]) }), 0);
  }
  close() {}
}

const pubkey = 'a'.repeat(64);
const field = {
  id: 'venue',
  type: 'geo',
  uiPlugin: 'venue',
  metadata: { wikiEntity: 'venue-entity-test' },
} as never;

describe('syncVenueEntity in test mode', () => {
  beforeEach(() => {
    registerEntityManifest(venueManifest);
    vi.stubGlobal('WebSocket', EmptyRelay);
    let n = 0;
    window.nostr = {
      getPublicKey: async () => pubkey,
      signEvent: async (event) => ({ ...event, id: `id${++n}`, pubkey, sig: 'sig' }),
    } as typeof window.nostr;
    (fetchOsmElement as Mock).mockResolvedValue(osm(5));
    clearDryRunEntries();
    setDryRun(true);
  });

  afterEach(() => {
    setDryRun(false);
    vi.unstubAllGlobals();
  });

  it('logs the new venue page instead of publishing it, and links the post to it', async () => {
    const tags = await syncVenueEntity(venue, field);
    const [entry] = getDryRunEntries();
    expect(getDryRunEntries()).toHaveLength(1);
    expect(entry?.event.kind).toBe(30818);
    expect(tags).toEqual([['a', `30818:${pubkey}:café-louvre-prague-venue`]]);
  });

  it('finds the logged page on the next post instead of creating it again', async () => {
    const first = await syncVenueEntity(venue, field);
    const second = await syncVenueEntity(venue, field);
    expect(second).toEqual(first);
    expect(getDryRunEntries()).toHaveLength(1);
  });
});
