import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { afterEach, describe, expect, it } from 'vitest';
import { WIKI_KIND } from './nip54';
import { validateWikiForm } from './validate';

const manifest = (fields: NostrPostManifest['fields']): NostrPostManifest => ({
  id: 'm',
  version: '1.0.0',
  fields,
});

describe('validateWikiForm', () => {
  afterEach(() => {
    pluginRegistry.unregister('test-validating');
  });

  it('passes when required fields are filled', () => {
    const m = manifest([
      {
        id: 'name',
        type: 'string',
        uiPlugin: 'text',
        required: true,
        mapTo: { kind: WIKI_KIND, target: 'table' },
      },
    ]);
    expect(validateWikiForm(m, { name: 'Pliny' })).toBeUndefined();
  });

  it.each([undefined, null, '', '   ', []])('rejects empty required value %j', (value) => {
    const m = manifest([
      {
        id: 'name',
        type: 'string',
        uiPlugin: 'text',
        required: true,
        metadata: { label: 'Name' },
        mapTo: { kind: WIKI_KIND, target: 'table' },
      },
    ]);
    expect(validateWikiForm(m, { name: value })).toBe('Name is required');
  });

  it('skips fields hidden from editing', () => {
    const m = manifest([
      {
        id: 'secret',
        type: 'string',
        uiPlugin: 'text',
        required: true,
        visibility: { edit: 'hidden' },
        mapTo: { kind: WIKI_KIND, target: 'table' },
      },
    ]);
    expect(validateWikiForm(m, {})).toBeUndefined();
  });

  it('uses the plugin validate hook when present', () => {
    pluginRegistry.register({
      id: 'test-validating',
      type: 'ref',
      validate: (value: unknown) =>
        value
          ? { success: true, data: undefined }
          : { success: false, error: { field: 'ref', message: 'Pick one', code: 'REQUIRED' } },
    } as never);
    const m = manifest([
      {
        id: 'ref',
        type: 'ref',
        uiPlugin: 'test-validating',
        mapTo: { kind: WIKI_KIND, target: 'tag', tagName: 'a' },
      },
    ]);
    expect(validateWikiForm(m, {})).toBe('Pick one');
    expect(validateWikiForm(m, { ref: 'x' })).toBeUndefined();
  });
});
