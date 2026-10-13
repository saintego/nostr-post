import { describe, expect, it } from 'vitest';
import { withHookTags } from './publishSummaries';

describe('withHookTags', () => {
  it('adds hook tags the event lacks, once', () => {
    const tags: [string, ...string[]][] = [
      ['d', 'x-brewery'],
      ['a', '30818:pk:x-venue'],
    ];
    expect(
      withHookTags(tags, [
        ['a', '30818:pk:x-venue'],
        ['a', '30818:pk:y-venue'],
      ])
    ).toEqual([...tags, ['a', '30818:pk:y-venue']]);
  });
});

describe('runPublishHooks', () => {
  it('runs a hook once for the same value in two fields, and links each field', async () => {
    const { runPublishHooks } = await import('@nostr-post/plugins/publish');
    let runs = 0;
    const plugin = {
      id: 'venue',
      type: 'geo' as const,
      beforePublish: async (): Promise<[string, ...string[]][]> => {
        runs++;
        return [['a', '30818:pk:u-fleku-venue']];
      },
    };
    const field = (id: string) => ({
      id,
      type: 'geo' as const,
      uiPlugin: 'venue',
      mapTo: { kind: 1, target: 'tag' as const, tagName: 'a' },
    });
    const venue = { geohash: 'u2fkb', lat: 50, lon: 14, osmType: 'node', osmId: '1' };
    const result = await runPublishHooks(
      { id: 'm', version: '1', fields: [field('tasting_at'), field('purchase_at')] },
      { tasting_at: venue, purchase_at: { ...venue } },
      'pk',
      () => plugin as never
    );
    expect(runs).toBe(1);
    expect(result.formData.tasting_at).toMatchObject({
      wikiEntity: { pubkey: 'pk', dTag: 'u-fleku-venue' },
    });
    expect(result.formData.purchase_at).toMatchObject({
      wikiEntity: { pubkey: 'pk', dTag: 'u-fleku-venue' },
    });
  });
});
