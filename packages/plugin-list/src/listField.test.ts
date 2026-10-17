import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nostr-post/signer', () => import('./testRelay.testHelpers').then((m) => m.signerMock));

import { provideEntityManifests } from '@nostr-post/plugins/entities';
import { runAfterPublish } from '@nostr-post/plugins/publish';
import type { PostField } from '@nostr-post/plugins/types';
import { itemsToSave, listFieldPlugin } from './listField';
import { createList } from './lists';
import { relay } from './testRelay.testHelpers';

const field = (metadata: Record<string, unknown> = {}): PostField =>
  ({
    id: 'lists',
    type: 'string',
    uiPlugin: 'list',
    mapTo: { kind: 1, target: 'tag' },
    metadata,
  }) as PostField;

const venueValue = { name: 'Tap House', wikiEntity: { pubkey: 'hub', dTag: 'tap-house-venue' } };
const venueAddress = '30818:hub:tap-house-venue';
const post = { id: 'post1', kind: 1, pubkey: 'me', created_at: 1, tags: [], content: '' };

beforeEach(() => relay.reset());

// What @nostr-post/wiki provides: inline manifests resolve to themselves
provideEntityManifests({
  resolve: async (ref) => (typeof ref === 'object' ? (ref as never) : undefined),
});

describe('list field', () => {
  it('saves the entity of saveField, else the post itself', () => {
    const ctx = { formData: { venue: venueValue }, events: [post] };
    expect(itemsToSave(field({ saveField: 'venue' }), ctx)).toEqual([
      { tag: 'a', value: venueAddress, relay: undefined },
    ]);
    // A picked entity (wiki-entity picker value)
    expect(
      itemsToSave(field({ saveField: 'beer' }), {
        formData: { beer: { dTag: 'pliny-beer', resolvedPubkey: 'pk' } },
        events: [],
      })
    ).toEqual([{ tag: 'a', value: '30818:pk:pliny-beer', relay: undefined }]);
    expect(itemsToSave(field(), ctx)).toEqual([{ tag: 'e', value: 'post1', relay: undefined }]);
  });

  it('adds nothing to the post', () => {
    expect(listFieldPlugin.serializeValue?.(['new:x'])).toBe('');
  });

  it('after publishing, saves to an existing list, a preset not created yet and a new list', async () => {
    const existing = await createList({ title: 'Pubs' });
    if (!existing.success) throw existing.error;
    const manifest = {
      id: 'venue-review',
      version: '1',
      fields: [
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 1, target: 'tag' },
          // The venue's entity manifest names the list (its title comes from there)
          metadata: {
            wikiEntity: {
              id: 'venue-e',
              version: '1',
              lists: [{ id: 'visited', label: 'Visited' }],
              listType: 'venue',
              fields: [],
            },
          },
        },
        field({ saveField: 'venue' }),
      ],
    };
    const formData = {
      // As runPublishHooks returns it: the venue linked to its page
      venue: venueValue,
      lists: [existing.data.address, '30003:me:nostr-post:venue:visited', 'new:Date night'],
    };
    const errors = await runAfterPublish(
      manifest as never,
      formData,
      { pubkey: 'me', events: [post] },
      (id) => (id === 'list' ? listFieldPlugin : undefined)
    );
    expect(errors).toEqual([]);

    const sets = relay.events.filter((e) => e.kind === 30003);
    const newest = (d: string) =>
      sets.filter((e) => e.tags.some((t) => t[0] === 'd' && t[1] === d)).at(-1);
    expect(newest(existing.data.dTag)?.tags).toContainEqual(['a', venueAddress]);
    expect(newest('nostr-post:venue:visited')?.tags).toEqual([
      ['d', 'nostr-post:venue:visited'],
      ['title', 'Visited'],
      ['a', venueAddress],
    ]);
    const dateNight = sets.find((e) =>
      e.tags.some((t) => t[0] === 'title' && t[1] === 'Date night')
    );
    expect(dateNight?.tags).toContainEqual(['a', venueAddress]);
  });

  it("reports a list it couldn't save to, without stopping the others", async () => {
    relay.accept = false;
    const errors = await runAfterPublish(
      { id: 'm', version: '1', fields: [field({ saveField: 'venue' })] } as never,
      { venue: venueValue, lists: ['new:A'] },
      { pubkey: 'me', events: [post] },
      () => listFieldPlugin
    );
    expect(errors.map((e) => e.message)).toEqual([
      'Saving to lists failed (A: No relay accepted the event)',
    ]);
  });
});
