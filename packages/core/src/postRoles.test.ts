import { describe, expect, it } from 'vitest';
import { coordinateEvents } from './coordinator';
import {
  decodeNaddr,
  encodeNaddr,
  isPostRoleField,
  parsePostRoles,
  plainTextContent,
  readPostRoles,
  roleLines,
} from './postRoles';
import type { NostrPostManifest, PostField } from './types';

const pk = 'a'.repeat(64);
const venue = `30818:${pk}:u-fleků-prague-venue`;
// From nostr-tools' nip19.naddrEncode (fields in another order)
const fromNostrTools =
  'naddr1qvzqqqrcvgpzp242424242424242424242424242424242424242424242424242qq2h2ttxd3jkh3d094c8yct8w4jj6an9de6k2ze4hq3';

const roleField = (id: string, label: string): PostField => ({
  id,
  type: 'ref',
  uiPlugin: 'wiki-entity-picker',
  mapTo: [
    { kind: 1, target: 'tag', tagName: 'a' },
    { kind: 1, target: 'content' },
  ],
  metadata: { label },
});
const tasted = roleField('tasting_at', 'Tasted at');
const bought = roleField('purchase_at', 'Purchased at');

describe('naddr', () => {
  it('encodes and decodes addresses, also from nostr-tools', () => {
    const naddr = encodeNaddr(venue) as string;
    expect(naddr).toMatch(/^naddr1/);
    expect(decodeNaddr(naddr)).toBe(venue);
    expect(decodeNaddr(fromNostrTools)).toBe(venue);
    expect(decodeNaddr(`${naddr.slice(0, -1)}q`)).toBeUndefined();
    expect(encodeNaddr('not-an-address')).toBeUndefined();
  });
});

describe('role fields in posts', () => {
  it('are ref fields mapped to an a tag and to plain-text content', () => {
    expect(isPostRoleField(tasted, 1)).toBe(true);
    expect(isPostRoleField(tasted, 30078)).toBe(false);
    expect(isPostRoleField({ ...tasted, mapTo: { kind: 1, target: 'tag', tagName: 'a' } }, 1)).toBe(
      false
    );
  });

  it('write a mention line and read it back by label, else by order', () => {
    const line = roleLines(tasted, {
      dTag: 'u-fleků-prague-venue',
      resolvedPubkey: pk,
    })[0] as string;
    expect(line).toMatch(/^Tasted at: nostr:naddr1/);
    const naddr = line.split('nostr:')[1];
    const content = `Great beer.\n\n${line}\nPurchased at: nostr:${encodeNaddr(`30818:${pk}:shop-venue`)}`;
    const { text, roles } = parsePostRoles(content, [tasted, bought]);
    expect(text).toBe('Great beer.');
    expect(roles.get('tasting_at')).toEqual([venue]);
    expect(roles.get('purchase_at')).toEqual([`30818:${pk}:shop-venue`]);
    // A label in another language falls back to field order
    const renamed = parsePostRoles(`Text\nOchutnáno v: nostr:${naddr}`, [tasted, bought]);
    expect(renamed.roles.get('tasting_at')).toEqual([venue]);
  });

  it('the coordinator puts role lines after the text, and addresses in NIP-78 content', () => {
    const manifest: NostrPostManifest = {
      id: 'beer-review',
      version: '1',
      fields: [
        tasted,
        {
          id: 'review',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: [
            { kind: 1, target: 'content' },
            { kind: 30078, target: 'content', path: 'review' },
          ],
        },
        {
          ...tasted,
          mapTo: [...[tasted.mapTo].flat(), { kind: 30078, target: 'content', path: 'tasting_at' }],
        },
      ].slice(1),
      publishFormats: [{ id: 'note', label: 'Note', kinds: [1], default: true }],
    };
    const ref = { dTag: 'u-fleků-prague-venue', resolvedPubkey: pk, externalIds: [] };
    const note = coordinateEvents(manifest, { review: 'Great beer.', tasting_at: ref });
    expect(note.success).toBe(true);
    if (!note.success) return;
    const event = note.data.events[0];
    expect(event?.content).toMatch(/^Great beer\.\nTasted at: nostr:naddr1\S+$/);
    expect(event?.tags).toContainEqual(['a', venue]);

    const appData = coordinateEvents(
      manifest,
      { review: 'Great beer.', tasting_at: ref },
      { activeKinds: [30078] }
    );
    expect(appData.success).toBe(true);
    if (!appData.success) return;
    expect(JSON.parse(appData.data.events[0]?.content ?? '{}')).toEqual({
      review: 'Great beer.',
      tasting_at: venue,
    });
  });

  it('reads a post into text, role values and the a tags left for other fields', () => {
    const beer = `30818:${pk}:pliny-beer`;
    const content = `Great beer.\n${roleLines(tasted, venue)[0]}`;
    const read = readPostRoles(
      {
        kind: 1,
        content,
        tags: [
          ['a', beer],
          ['a', venue],
        ],
      },
      [tasted, bought]
    );
    expect(read.text).toBe('Great beer.');
    expect(read.values.tasting_at).toMatchObject({
      dTag: 'u-fleků-prague-venue',
      resolvedPubkey: pk,
      wikiEntity: { pubkey: pk, dTag: 'u-fleků-prague-venue' },
    });
    expect(read.tags).toEqual([['a', beer]]);
  });

  it('a link-only venue field writes its page as a mention line, also when not a ref field', () => {
    const venueField: PostField = {
      id: 'tasting_at',
      type: 'geo',
      uiPlugin: 'venue',
      mapTo: [
        { kind: 1, target: 'tag', tagName: 'a' },
        { kind: 1, target: 'content' },
      ],
      metadata: { label: 'Tasted at', linkOnly: true },
    };
    expect(isPostRoleField(venueField, 1)).toBe(true);
    const value = {
      geohash: 'u2fkb',
      lat: 50,
      lon: 14,
      wikiEntity: { pubkey: pk, dTag: 'u-fleků-prague-venue' },
    };
    expect(roleLines(venueField, value)[0]).toMatch(/^Tasted at: nostr:naddr1/);
    // Before the venue hub ran there's no page yet: no line
    expect(roleLines(venueField, { geohash: 'u2fkb', lat: 50, lon: 14 })).toEqual([]);
  });
});

describe('plainTextContent', () => {
  const textField = (id: string): PostField => ({
    id,
    type: 'string',
    uiPlugin: 'text',
    mapTo: { kind: 1, target: 'content' },
  });

  it('writes lists of values as text and skips null, role fields as mention lines', () => {
    const content = plainTextContent(
      [textField('review'), textField('tags'), textField('note'), tasted],
      {
        review: 'Great beer.',
        tags: ['hoppy', 'pale'],
        note: null,
        tasting_at: { dTag: 'u-fleků-prague-venue', resolvedPubkey: pk },
      }
    );
    const [review, tags, line, ...rest] = content.split('\n');
    expect([review, tags, rest]).toEqual(['Great beer.', 'hoppy, pale', []]);
    expect(line).toMatch(/^Tasted at: nostr:naddr1/);
    expect(plainTextContent([textField('tags')], { tags: [] })).toBe('');
  });
});
