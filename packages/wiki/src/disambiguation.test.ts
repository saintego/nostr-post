import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import {
  distinguishingFieldLabels,
  distinguishingSuggestions,
  entityDTagFor,
  nameFieldId,
} from './disambiguation';

const beer = {
  id: 'beer',
  version: '1',
  wikiConfig: { titleTemplate: '{title} (Beer)', dTagTemplate: '{title}-(beer)' },
  fields: [
    { id: 'title', type: 'string', uiPlugin: 'text', mapTo: { kind: 30818, target: 'table' } },
    {
      id: 'brewery',
      type: 'ref',
      uiPlugin: 'wiki-entity-picker',
      mapTo: { kind: 30818, target: 'tag', tagName: 'a' },
    },
    {
      id: 'style',
      type: 'enum',
      uiPlugin: 'select',
      mapTo: { kind: 30818, target: 'tag', tagName: 't' },
    },
    { id: 'abv', type: 'number', uiPlugin: 'number', mapTo: { kind: 30818, target: 'table' } },
    {
      id: 'description',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 30818, target: 'content' },
    },
  ],
} as unknown as NostrPostManifest;

describe('disambiguation', () => {
  it('finds the name field from the template', () => {
    expect(nameFieldId(beer)).toBe('title');
  });

  it('adds the qualifier to the name in the d-tag', () => {
    expect(entityDTagFor(beer, { title: 'Bitcoin' })).toBe('bitcoin-beer');
    expect(entityDTagFor(beer, { title: 'Bitcoin' }, 'Moonshine')).toBe('bitcoin-moonshine-beer');
    expect(entityDTagFor(beer, { title: 'Bitcoin' }, '  ')).toBe('bitcoin-beer');
  });

  it('suggests short values of other fields, refs by name', () => {
    const formData = {
      title: 'Bitcoin',
      brewery: { dTag: 'moonshine-brewery', displayName: 'Moonshine (Brewery)' },
      style: 'IPA',
      abv: 6.5,
      description: 'A long description\nwith several lines',
    };
    expect(distinguishingSuggestions(beer, formData)).toEqual(['Moonshine', 'IPA', '6.5']);
  });

  it('names fields usable as qualifiers, skipping the name and long text', () => {
    expect(distinguishingFieldLabels(beer)).toEqual(['brewery', 'style', 'abv']);
  });
});
