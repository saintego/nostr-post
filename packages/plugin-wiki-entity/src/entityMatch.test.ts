import { describe, expect, it } from 'vitest';
import { confirmMatch, isUnconfirmed, rejectMatch } from './entityMatch';

const instead = {
  dTag: '',
  resolvedPubkey: '',
  externalIds: ['instagram:naraka'],
  displayName: 'Naraka',
  unlinked: true as const,
  prefill: { title: 'Naraka' },
};
const found = {
  dTag: 'naraka-musician',
  resolvedPubkey: 'a'.repeat(64),
  externalIds: ['instagram:naraka', 'spotify:artist:x'],
  displayName: 'Naraka',
  match: { by: 'name' as const, instead },
};

describe('entityMatch', () => {
  it("keeps the page when it's them, without the mark", () => {
    expect(isUnconfirmed(found)).toBe(true);
    const confirmed = confirmMatch(found);
    expect(isUnconfirmed(confirmed)).toBe(false);
    expect(confirmed.dTag).toBe('naraka-musician');
    expect('match' in confirmed).toBe(false);
  });

  it("drops the page when it's not them: the name and links it was read with", () => {
    expect(rejectMatch(found)).toBe(instead);
  });

  it('leaves values without a mark as they are', () => {
    const picked = { dTag: 'x', resolvedPubkey: 'b', externalIds: [] };
    expect(isUnconfirmed(picked)).toBe(false);
    expect(rejectMatch(picked)).toBe(picked);
  });
});
