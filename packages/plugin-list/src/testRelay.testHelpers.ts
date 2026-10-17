import { vi } from 'vitest';
import type { ListEvent } from './types';

/**
 * An in-memory relay and signer for tests, in place of @nostr-post/signer:
 * `vi.mock('@nostr-post/signer', () => import('./testRelay.testHelpers').then((m) => m.signerMock))`
 */
export const relay = {
  events: [] as Array<ListEvent & { id: string; sig: string }>,
  /** Relays accept what's published unless false */
  accept: true,
  reset() {
    this.events = [];
    this.accept = true;
    signerMock.signAndPublish.mockClear();
  },
};

let nextId = 0;

const matches = (event: ListEvent & { id: string }, filter: Record<string, unknown>) =>
  Object.entries(filter).every(([key, wanted]) => {
    if (!Array.isArray(wanted)) return true;
    const values = wanted as Array<string | number>;
    if (key === 'kinds') return values.includes(event.kind);
    if (key === 'authors') return values.includes(event.pubkey);
    if (key === 'ids') return values.includes(event.id);
    if (key.startsWith('#')) {
      return event.tags.some((t) => t[0] === key.slice(1) && values.includes(t[1] ?? ''));
    }
    return true;
  });

export const signerMock = {
  DEFAULT_RELAYS: ['wss://default'],
  hasNostrSigner: () => true,
  getPublicKey: vi.fn(async () => 'me'),
  fetchUserRelays: vi.fn(async (_pk: string, relays: string[]) => relays),
  getPublishRelays: vi.fn(async (_pk: string, relays: string[]) => relays),
  fetchEvents: vi.fn(async (filter: Record<string, unknown> | Record<string, unknown>[]) => {
    const filters = Array.isArray(filter) ? filter : [filter];
    return relay.events.filter((e) => filters.some((f) => matches(e, f)));
  }),
  signAndPublish: vi.fn(async (event: ListEvent, relays: string[]) => {
    nextId += 1;
    const signedEvent = { ...event, id: `id${nextId}`, sig: 'sig' };
    if (relay.accept) relay.events.push(signedEvent);
    const ok = relay.accept ? relays.length : 0;
    return {
      signedEvent,
      publishResults: { success: ok, failed: relays.length - ok, results: [] },
    };
  }),
};
