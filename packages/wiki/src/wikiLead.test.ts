import { describe, expect, it } from 'vitest';
import { manifestToWikiEvent, wikiEventToManifestData } from './nip54';
import type { WikiManifest } from './types';
import { wikiLead, withoutLead } from './wikiLead';

const manifest: WikiManifest = {
  id: 'artist-v1',
  version: '1.0.0',
  wikiConfig: { titleTemplate: '{title} (musician)', lead: ['genres', 'links', 'title', 'about'] },
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30818, target: 'table' },
    },
    {
      id: 'genres',
      type: 'string',
      uiPlugin: 'not-loaded',
      mapTo: { kind: 30818, target: 'tag', tagName: 't' },
      metadata: { label: 'Genres' },
    },
    {
      id: 'links',
      type: 'string',
      uiPlugin: 'not-loaded',
      mapTo: { kind: 30818, target: 'tag', tagName: 'r' },
      metadata: { label: 'Listen' },
    },
    {
      id: 'about',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: { kind: 30818, target: 'content' },
    },
  ],
};

const data = {
  title: 'Monument X',
  genres: ['hardcore', 'youth-crew'],
  links: ['https://monumentx.bandcamp.com'],
};

describe('wikiLead', () => {
  it('shows the lead fields kept in tags only, in their order, with labels', () => {
    expect(wikiLead(manifest, data)).toBe(
      'Genres: hardcore, youth-crew\n\nListen: https://monumentx.bandcamp.com'
    );
  });

  it('leaves out empty fields, and is empty without wikiConfig.lead', () => {
    expect(wikiLead(manifest, { genres: [] })).toBe('');
    expect(wikiLead({ ...manifest, wikiConfig: {} }, data)).toBe('');
  });

  it('starts the page, before the infobox', () => {
    const event = manifestToWikiEvent(manifest, { ...data, about: 'From Bangkok.' });
    expect(event.content.startsWith('Genres: hardcore, youth-crew\n\nListen: ')).toBe(true);
    expect(event.content.indexOf('Listen:')).toBeLessThan(event.content.indexOf('| title'));
    expect(event.content.endsWith('From Bangkok.')).toBe(true);
  });

  it('is stripped when read: the infobox and the text read as before', () => {
    const event = manifestToWikiEvent(manifest, { ...data, about: 'From Bangkok.' });
    const read = wikiEventToManifestData({ ...event, id: 'x', pubkey: 'p', sig: '' }, manifest);
    expect(read.title).toBe('Monument X');
    expect(read.about).toBe('From Bangkok.');
    expect(read.genres).toEqual(['hardcore', 'youth-crew']);
  });

  it('is stripped also when it is all the text', () => {
    const event = manifestToWikiEvent(manifest, data);
    const read = wikiEventToManifestData({ ...event, id: 'x', pubkey: 'p', sig: '' }, manifest);
    expect(read.about).toBeUndefined();
    expect(read.title).toBe('Monument X');
  });

  it("is stripped by its labels when the tags no longer give it exactly (it's written again)", () => {
    const event = manifestToWikiEvent(manifest, { ...data, about: 'From Bangkok.' });
    const edited = { ...event, tags: event.tags.filter((t) => t[0] !== 'r') };
    const read = wikiEventToManifestData({ ...edited, id: 'x', pubkey: 'p', sig: '' }, manifest);
    expect(read.about).toBe('From Bangkok.');
    expect(read.title).toBe('Monument X');
  });

  it('is stripped when its values are formatted otherwise (a plugin, another client)', () => {
    const content = [
      'Genres: #hardcore #youth-crew',
      'Listen: https://monumentx.bandcamp.com',
      '| Field | Value |\n|---|---|\n| title | Monument X |',
      'From **Bangkok**.',
    ].join('\n\n');
    const tags = [
      ['d', 'monument-x-musician'],
      ['t', 'hardcore'],
      ['r', 'https://monumentx.bandcamp.com'],
    ];
    const read = wikiEventToManifestData(
      { kind: 30818, content, tags, created_at: 1, id: 'x', pubkey: 'p', sig: '' },
      manifest
    );
    expect(read.title).toBe('Monument X');
    expect(read.about).toBe('From **Bangkok**.');
  });

  it('keeps a text that only mentions a label later on', () => {
    expect(withoutLead('About us\n\nListen: here', '', ['Listen'])).toBe(
      'About us\n\nListen: here'
    );
    expect(withoutLead('Listen: a\n\nGenres: b', '', ['Listen', 'Genres'])).toBe('');
  });
});

describe('the infobox after text', () => {
  it('is read as the infobox; the text around it is the prose', () => {
    const content = 'From Bangkok.\n\n| Field | Value |\n|---|---|\n| title | Monument X |';
    const read = wikiEventToManifestData(
      { kind: 30818, content, tags: [['d', 'x']], created_at: 1, id: 'x', pubkey: 'p', sig: '' },
      manifest
    );
    expect(read.title).toBe('Monument X');
    expect(read.about).toBe('From Bangkok.');
  });
});
