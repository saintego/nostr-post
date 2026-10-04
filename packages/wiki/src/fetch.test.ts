import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@nostr-post/signer', () => ({
  fetchEvents: vi.fn(),
  fetchEventsFromRelay: vi.fn(),
}));

import { fetchEventsFromRelay } from '@nostr-post/signer';
import { checkEntityDTag } from './fetch';

const version = {
  id: 'v',
  pubkey: 'p',
  sig: 's',
  kind: 30818,
  created_at: 1,
  content: '',
  tags: [['d', 'bitcoin']],
};

/** Each relay answers with its events, or fails when given an Error */
function relaysAnswer(answers: Record<string, unknown[] | Error>) {
  (fetchEventsFromRelay as Mock).mockImplementation(
    (relay: string, _filter: unknown, options?: { onEvent?: (e: unknown) => void }) => {
      const answer = answers[relay];
      if (answer instanceof Error) return Promise.reject(answer);
      for (const ev of answer ?? []) options?.onEvent?.(ev);
      return Promise.resolve(answer ?? []);
    }
  );
}

describe('checkEntityDTag', () => {
  beforeEach(() => (fetchEventsFromRelay as Mock).mockReset());

  it('is taken when any relay has a version', async () => {
    relaysAnswer({ a: [], b: [version] });
    expect(await checkEntityDTag('bitcoin', ['a', 'b'])).toBe('taken');
  });

  it('is free when every relay answered without one', async () => {
    relaysAnswer({ a: [], b: [] });
    expect(await checkEntityDTag('bitcoin', ['a', 'b'])).toBe('free');
  });

  it('is unknown when a relay failed and none had it', async () => {
    relaysAnswer({ a: new Error('connection failed'), b: [] });
    expect(await checkEntityDTag('bitcoin', ['a', 'b'])).toBe('unknown');
  });

  it('is taken even if another relay failed', async () => {
    relaysAnswer({ a: new Error('connection failed'), b: [version] });
    expect(await checkEntityDTag('bitcoin', ['a', 'b'])).toBe('taken');
  });
});
