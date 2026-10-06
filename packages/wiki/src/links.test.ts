import { describe, expect, it } from 'vitest';
import { linkFromTemplate, manifestLinks } from './links';

const btcMap = {
  label: 'BTC Map',
  url: 'https://btcmap.org/merchant/{i:osm}',
  when: { field: 'bitcoin', equals: 'yes' },
};
const tags = [
  ['d', 'cafe-prague-venue'],
  ['i', 'osm:node:123'],
];

describe('linkFromTemplate', () => {
  it('fills i-tag placeholders when the condition holds', () => {
    expect(linkFromTemplate(btcMap, tags, { bitcoin: 'Yes' })).toEqual({
      url: 'https://btcmap.org/merchant/node:123',
      provider: 'BTC Map',
    });
  });

  it('is left out when the condition fails or a placeholder has no value', () => {
    expect(linkFromTemplate(btcMap, tags, { bitcoin: 'no' })).toBeUndefined();
    expect(linkFromTemplate(btcMap, tags, {})).toBeUndefined();
    expect(linkFromTemplate(btcMap, [['d', 'x']], { bitcoin: 'yes' })).toBeUndefined();
  });

  it('fills and encodes field placeholders', () => {
    const search = { label: 'Search', url: 'https://example.org/?q={name}' };
    expect(linkFromTemplate(search, [], { name: 'Café Louvre' })?.url).toBe(
      'https://example.org/?q=Caf%C3%A9%20Louvre'
    );
  });
});

describe('manifestLinks', () => {
  it("uses the manifest's wikiConfig.links", () => {
    const manifest = { id: 'm', version: '1', fields: [], wikiConfig: { links: [btcMap] } };
    expect(manifestLinks(manifest, tags, { bitcoin: 'yes' })).toHaveLength(1);
    expect(manifestLinks({ id: 'm', version: '1', fields: [] }, tags, {})).toEqual([]);
  });
});
