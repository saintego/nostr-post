import type { PostField } from '@nostr-post/plugins/types';
import { describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
vi.mock('@nostr-post/signer', async (original) => ({
  ...(await original<object>()),
  fetchEvents: (...args: unknown[]) => fetchEvents(...args),
}));

const { profilePlugin } = await import('./core');

const field = {
  id: 'participants',
  type: 'profile',
  uiPlugin: 'profile',
  mapTo: { kind: 31923, target: 'tag', tagName: 'p' },
  metadata: { roles: ['host', 'performer'] },
} as PostField;

const profile = (pubkey: string, name: string) => ({
  id: pubkey,
  pubkey,
  kind: 0,
  created_at: 1,
  tags: [],
  content: JSON.stringify({ name }),
  sig: '',
});
const ALICE = 'a'.repeat(64);
const ALICE2 = 'b'.repeat(64);
const BOB = 'c'.repeat(64);

describe('people in form JSON', () => {
  it("asks for names and the field's roles", () => {
    expect(profilePlugin.jsonSchema?.(field)).toMatchObject({
      type: 'array',
      items: {
        properties: { role: { anyOf: [{ enum: ['host', 'performer'] }, { type: 'null' }] } },
      },
    });
  });

  it('takes a name with exactly one profile of that name, and npubs', async () => {
    fetchEvents.mockImplementation(async (filter: { search: string }) =>
      filter.search === 'Alice'
        ? [profile(ALICE, 'Alice'), profile(ALICE2, 'alice'), profile(BOB, 'Alice Cooper')]
        : [profile(BOB, 'Bob'), profile(ALICE, 'Bobby')]
    );
    const { value } =
      (await profilePlugin.parseJson?.(
        [
          { name: 'Alice', role: 'host' },
          { name: 'Bob', role: 'performer' },
          { name: `nostr:${'d'.repeat(64)}`, role: 'dj' },
        ],
        field
      )) ?? {};
    // Two Alices: unsure, left out; Bob found; a pasted key, without a role the field lacks
    expect(value).toEqual([{ pubkey: BOB, role: 'performer' }, { pubkey: 'd'.repeat(64) }]);
  });
});
