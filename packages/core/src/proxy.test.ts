import { describe, expect, it } from 'vitest';
import { coordinateEvents } from './coordinator';
import { proxyOf, proxyTag, siteOf, sourceUrl } from './proxy';
import type { NostrPostManifest } from './types';

describe('NIP-48 proxy tags', () => {
  it('writes and reads a source', () => {
    expect(proxyTag('https://example.com/e/1')).toEqual([
      'proxy',
      'https://example.com/e/1',
      'web',
    ]);
    expect(proxyOf([['t', 'x'], proxyTag('https://gancio.org/event/1', 'activitypub')])).toEqual({
      id: 'https://gancio.org/event/1',
      protocol: 'activitypub',
    });
    expect(proxyOf([['proxy', '']])).toBeUndefined();
  });

  it('links to the source in a browser', () => {
    expect(sourceUrl({ id: 'https://example.com/a', protocol: 'web' })).toBe(
      'https://example.com/a'
    );
    expect(sourceUrl({ id: 'at://did:plc:abc/app.bsky.feed.post/3jt5', protocol: 'atproto' })).toBe(
      'https://bsky.app/profile/did:plc:abc/post/3jt5'
    );
    expect(
      sourceUrl({
        id: 'https://soapbox.pub/rss/feed.xml#https%3A%2F%2Fsoapbox.pub%2Fblog%2Fpost',
        protocol: 'rss',
      })
    ).toBe('https://soapbox.pub/blog/post');
    expect(sourceUrl({ id: 'urn:x', protocol: 'web' })).toBeUndefined();
  });

  it('names the site', () => {
    expect(siteOf('https://www.facebook.com/events/1')).toBe('facebook.com');
  });

  it("writes a target's fixed tag elements after the value (tagExtra)", () => {
    const manifest: NostrPostManifest = {
      id: 'm',
      version: '1',
      publishFormats: [{ id: 'note', label: 'Note', kinds: [1], default: true }],
      fields: [
        {
          id: 'source',
          type: 'string',
          uiPlugin: 'text',
          mapTo: [
            { kind: 1, target: 'tag', tagName: 'proxy', tagExtra: ['web'] },
            { kind: 1, target: 'tag', tagName: 'r' },
          ],
        },
      ],
    };
    const result = coordinateEvents(manifest, { source: 'https://example.com/e' }, { pubkey: 'p' });
    if (!result.success) throw new Error('not coordinated');
    expect(result.data.events[0]?.tags).toEqual(
      expect.arrayContaining([
        ['proxy', 'https://example.com/e', 'web'],
        ['r', 'https://example.com/e'],
      ])
    );
  });
});
