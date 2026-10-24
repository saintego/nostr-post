import type { PostField } from '@nostr-post/plugins/types';
import { describe, expect, it } from 'vitest';
import {
  fieldRoles,
  peopleFromTags,
  personFromText,
  personTag,
  profilePlugin,
  withoutPerson,
  withPerson,
} from './core';

const HEX = '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';
const NPUB = 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6';
const other = 'b'.repeat(64);

const field: PostField = {
  id: 'participants',
  type: 'profile',
  uiPlugin: 'profile',
  mapTo: { kind: 31923, target: 'tag', tagName: 'p' },
  metadata: { roles: ['host', 'speaker'], max: 2 },
};

describe('personFromText', () => {
  it('reads npubs, hex keys and nostr: links; not names', () => {
    expect(personFromText(NPUB)).toEqual({ pubkey: HEX });
    expect(personFromText(`nostr:${NPUB}`)).toEqual({ pubkey: HEX });
    expect(personFromText(HEX.toUpperCase())).toEqual({ pubkey: HEX });
    expect(personFromText('fiatjaf')).toBeUndefined();
  });
});

describe('p tags', () => {
  it('writes relay and role only as far as needed', () => {
    expect(personTag({ pubkey: HEX })).toEqual(['p', HEX]);
    expect(personTag({ pubkey: HEX, relay: 'wss://r' })).toEqual(['p', HEX, 'wss://r']);
    expect(personTag({ pubkey: HEX, role: 'speaker' })).toEqual(['p', HEX, '', 'speaker']);
  });

  it('reads people back, each once', () => {
    expect(
      peopleFromTags([
        ['p', HEX, '', 'host'],
        ['p', other, 'wss://r'],
        ['p', HEX, '', 'speaker'],
        ['p', 'not-a-key'],
        ['e', other],
      ])
    ).toEqual([
      { pubkey: HEX, role: 'host' },
      { pubkey: other, relay: 'wss://r' },
    ]);
  });

  it('round-trips through the plugin', () => {
    const people = [{ pubkey: HEX, role: 'host' }, { pubkey: other }];
    const tags = profilePlugin.extraTags?.(people, field) ?? [];
    expect(profilePlugin.serializeValue?.(people[0], field)).toBe('');
    expect(profilePlugin.resolveFromTags?.(tags, field)).toEqual(people);
  });
});

describe('editing and checking people', () => {
  it('adds, updates the role of and removes people', () => {
    const people = withPerson([{ pubkey: HEX }], { pubkey: other });
    expect(withPerson(people, { pubkey: HEX, role: 'host' })).toEqual([
      { pubkey: HEX, role: 'host' },
      { pubkey: other },
    ]);
    expect(withoutPerson(people, HEX)).toEqual([{ pubkey: other }]);
  });

  it('validates keys and the maximum', () => {
    expect(profilePlugin.validate?.([{ pubkey: HEX }], field).success).toBe(true);
    expect(profilePlugin.validate?.([{ pubkey: 'x' }], field).success).toBe(false);
    const three = [{ pubkey: HEX }, { pubkey: other }, { pubkey: 'c'.repeat(64) }];
    expect(profilePlugin.validate?.(three, field)).toMatchObject({
      success: false,
      error: { code: 'TOO_MANY_PEOPLE' },
    });
    expect(fieldRoles(field)).toEqual(['host', 'speaker']);
  });
});
