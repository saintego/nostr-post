import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { entityDTagFor } from './disambiguation';
import { interpolateTemplate, templateText } from './identity';

const brewery = {
  dTag: 'russian-river-brewing-brewery',
  resolvedPubkey: 'pk',
  externalIds: [],
  displayName: 'Russian River Brewing (Brewery)',
};

describe('templateText', () => {
  it('uses a referenced entity name without its type', () => {
    expect(templateText(brewery)).toBe('Russian River Brewing');
  });

  it('falls back to the d-tag of a reference without a name', () => {
    expect(templateText({ dTag: 'moonshine-brewery' })).toBe('moonshine-brewery');
  });

  it('joins lists and keeps primitives', () => {
    expect(templateText(['IPA', 'Hazy'])).toBe('IPA, Hazy');
    expect(templateText(6.5)).toBe('6.5');
    expect(templateText(undefined)).toBe('');
  });
});

describe('interpolateTemplate with references', () => {
  it('fills a reference field with its name, not [object Object]', () => {
    expect(interpolateTemplate('{title} by {brewery}', { title: 'Pliny', brewery })).toBe(
      'Pliny by Russian River Brewing'
    );
  });

  it('builds a d-tag from a reference field', () => {
    const manifest = {
      id: 'beer',
      version: '1',
      wikiConfig: { dTagTemplate: '{title}-{brewery}-(beer)' },
      fields: [],
    } as unknown as NostrPostManifest;
    expect(entityDTagFor(manifest, { title: 'Pliny', brewery })).toBe(
      'pliny-russian-river-brewing-beer'
    );
  });
});
