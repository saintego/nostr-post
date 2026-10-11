import { describe, expect, it } from 'vitest';
import { coordinateEvents } from './coordinator';
import {
  fieldOptionLabel,
  groupFieldOptions,
  matchFieldOption,
  validateFieldOptions,
} from './enumOptions';
import { applyUpdateCommentsToEvent } from './eventUpdates';
import type { NostrPostManifest, PostField } from './types';

const style: PostField = {
  id: 'style',
  type: 'enum',
  uiPlugin: 'select',
  mapTo: { kind: 1, target: 'tag', tagName: 't' },
  options: [
    { value: 'american-ipa', label: 'American IPA', group: '21. IPA', code: '21A' },
    { value: 'hazy-ipa', label: 'Hazy IPA', group: '21. IPA', code: '21C' },
    { value: 'kellerbier', label: 'Kellerbier', group: '27. Historical Beer', code: '27A' },
    { value: 'sahti', label: 'Sahti', group: '27. Historical Beer', code: '27A' },
    'other',
  ],
};

describe('enum options', () => {
  it('labels and groups', () => {
    expect(fieldOptionLabel(style, 'american-ipa')).toBe('American IPA');
    expect(fieldOptionLabel(style, 'other')).toBe('other');
    expect(fieldOptionLabel(style, 'unknown')).toBe('unknown');
    expect(groupFieldOptions(style).map((g) => [g.group, g.options.length])).toEqual([
      ['21. IPA', 2],
      ['27. Historical Beer', 2],
      ['', 1],
    ]);
  });

  it('matches a value or a label (case-insensitive) back to the option', () => {
    expect(matchFieldOption(style, 'hazy-ipa')?.value).toBe('hazy-ipa');
    expect(matchFieldOption(style, 'American IPA')?.value).toBe('american-ipa');
    expect(matchFieldOption(style, 'SAHTI')?.value).toBe('sahti');
    expect(matchFieldOption(style, '21A')).toBeUndefined();
  });

  it('validates option shapes; codes may repeat, values may not', () => {
    expect(validateFieldOptions(style).success).toBe(true);
    const bad = (options: unknown[]) =>
      validateFieldOptions({ ...style, options: options as PostField['options'] });
    expect(bad([]).success).toBe(false);
    expect(bad([{ label: 'no value' }]).success).toBe(false);
    expect(bad([{ value: 'a', group: 1 }]).success).toBe(false);
    expect(bad([{ value: 'a', code: 21 }]).success).toBe(false);
    expect(bad(['a', { value: 'a' }]).success).toBe(false);
  });

  it('coordinator publishes the value as one tag', () => {
    const manifest: NostrPostManifest = {
      id: 'beer',
      version: '1.0.0',
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
        style,
      ],
    };
    const result = coordinateEvents(manifest, { content: 'hi', style: 'american-ipa' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const tags = result.data.events[0]?.tags ?? [];
    expect(tags.filter((t) => t[0] !== 'a' && t[0] !== 'content')).toEqual([['t', 'american-ipa']]);
    expect(coordinateEvents(manifest, { content: 'hi', style: 'American IPA' }).success).toBe(
      false
    );
  });

  it('update comments accept a label', () => {
    const manifest: NostrPostManifest = { id: 'm', version: '1', fields: [style] };
    const event = {
      kind: 1,
      created_at: 1,
      pubkey: 'pk',
      content: 'hi',
      tags: [['t', 'american-ipa']] as [string, ...string[]][],
    };
    const update = { ...event, created_at: 2, content: 'update:style:Hazy IPA', tags: [] };
    expect(applyUpdateCommentsToEvent(event, manifest, [update]).tags).toEqual([['t', 'hazy-ipa']]);
  });
});
