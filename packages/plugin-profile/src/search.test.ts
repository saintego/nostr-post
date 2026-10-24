import { describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
vi.mock('@nostr-post/signer', async (original) => ({
  ...(await original<typeof import('@nostr-post/signer')>()),
  fetchEvents: (...args: unknown[]) => fetchEvents(...args),
}));

import { profileName, searchProfiles } from './search';

const profile = (pubkey: string, name: string, createdAt = 1) => ({
  id: pubkey,
  pubkey,
  kind: 0,
  created_at: createdAt,
  tags: [],
  content: JSON.stringify({ name }),
  sig: '',
});

describe('searchProfiles', () => {
  it('asks search relays for profiles, names starting with the query first', async () => {
    fetchEvents.mockResolvedValueOnce([
      profile('a'.repeat(64), 'Old Alice', 1),
      profile('b'.repeat(64), 'Bob Alison'),
      profile('a'.repeat(64), 'Alice', 2),
    ]);
    const found = await searchProfiles('ali', { relays: ['wss://search'] });
    expect(fetchEvents).toHaveBeenCalledWith(
      { kinds: [0], search: 'ali', limit: 20 },
      ['wss://search'],
      { waitForAll: true }
    );
    expect(found.map((f) => f.profile.name)).toEqual(['Alice', 'Bob Alison']);
  });

  it('needs 2 characters', async () => {
    fetchEvents.mockClear();
    expect(await searchProfiles('a')).toEqual([]);
    expect(fetchEvents).not.toHaveBeenCalled();
  });

  it('names a profile by display name, name or key', () => {
    expect(profileName('c'.repeat(64), { display_name: 'C', name: 'c' })).toBe('C');
    expect(profileName('c'.repeat(64))).toBe('cccccccc…');
  });
});
