import { encodeNaddr } from '@nostr-post/core/nip19';
import type { DisplayableEvent, NostrPostManifest, PostSection } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { describe, expect, it } from 'vitest';
import { alsoLinkOptions, alsoLinkTags } from './alsoLinks';

const pk = 'a'.repeat(64);
const venue = `30818:${pk}:jam-bangkok-venue`;
const band = `30818:${pk}:naraka-musician`;
const gig = `31923:${pk}:gig`;

// A venue field reading its page from the tags, as the venue plugin does
pluginRegistry.register({
  id: 'test-venue',
  validate: () => ({ success: true, data: undefined }),
  formatValue: () => '',
  resolveFromTags: (tags: string[][]) => {
    const [, pubkey = '', ...d] =
      tags
        .filter((t) => t[0] === 'a')
        .at(-1)?.[1]
        ?.split(':') ?? [];
    return { wikiEntity: { pubkey, dTag: d.join(':') } };
  },
} as never);

const manifest: NostrPostManifest = {
  id: 'gig',
  version: '1.0.0',
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 31923, target: 'tag', tagName: 'title' },
    },
    {
      id: 'location',
      type: 'geo',
      uiPlugin: 'test-venue',
      mapTo: { kind: 31923, target: 'tag', tagName: 'g' },
    },
    {
      id: 'performers',
      type: 'ref',
      uiPlugin: 'wiki-entity-picker',
      mapTo: [
        { kind: 31923, target: 'tag', tagName: 'a' },
        { kind: 31923, target: 'content' },
      ],
      metadata: { label: 'Performers', multiple: true },
    },
  ],
};

const event: DisplayableEvent = {
  id: 'e',
  pubkey: pk,
  kind: 31923,
  created_at: 1,
  content: `Live\nPerformers: nostr:${encodeNaddr(band)}`,
  tags: [
    ['d', 'gig'],
    ['title', 'Gig'],
    ['a', band],
    ['g', 'w4rw0d'],
    ['a', venue],
  ],
  sig: '',
};

const section = (also: { field: string; checked?: boolean }[]): PostSection => ({
  label: 'Photos',
  add: { manifest: 'event-media-v1', field: 'event', also },
});

describe('alsoLinkOptions', () => {
  it("offers the pages the event's fields link, ticked as the manifest says", () => {
    expect(
      alsoLinkOptions(
        section([{ field: 'location', checked: true }, { field: 'performers' }]),
        manifest,
        event,
        gig
      )
    ).toEqual([
      { address: venue, fieldId: 'location', checked: true },
      { address: band, fieldId: 'performers', checked: false },
    ]);
  });

  it('offers nothing without `also`, and each page once', () => {
    expect(alsoLinkOptions({ label: 'Photos', add: { manifest: 'm' } }, manifest, event)).toEqual(
      []
    );
    const twice = alsoLinkOptions(
      section([{ field: 'performers' }, { field: 'performers' }]),
      manifest,
      event
    );
    expect(twice.map((o) => o.address)).toEqual([band]);
  });

  it('links them as `a` tags for the composer', () => {
    expect(alsoLinkTags([venue, band])).toBe(`a:${venue},a:${band}`);
  });
});
