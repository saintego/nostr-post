import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nostr-post/signer', () => ({
  fetchEvents: vi.fn(),
  fetchEventsFromRelay: vi.fn(),
}));

import { fetchEventsFromRelay } from '@nostr-post/signer';
import { checkEntityDTag, checkEntitySlug } from './fetch';

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

describe('checkEntitySlug', () => {
  beforeEach(() => {
    (fetchEventsFromRelay as Mock).mockReset();
  });

  const manifest = {
    id: 'musician',
    version: '1',
    wikiConfig: { dTagTemplate: '{title}-(musician)' },
    fields: [],
  } as never;

  /** One relay; the d-tags in `taken` have a version */
  const taken = (dTags: string[]) =>
    (fetchEventsFromRelay as Mock).mockImplementation(
      (
        _relay: string,
        filter: { '#d': string[] },
        options?: { onEvent?: (e: unknown) => void }
      ) => {
        const found = dTags.includes(filter['#d'][0] ?? '') ? [version] : [];
        for (const ev of found) options?.onEvent?.(ev);
        return Promise.resolve(found);
      }
    );

  it('keeps the name when its slug is free', async () => {
    taken([]);
    expect(
      await checkEntitySlug(manifest, { title: 'Doomsday' }, { candidates: ['x'], relays: ['a'] })
    ).toEqual({ status: 'free', qualifier: '' });
  });

  it('takes the first candidate whose slug is free', async () => {
    taken(['doomsday-musician', 'doomsday-doomsdayband-musician']);
    expect(
      await checkEntitySlug(
        manifest,
        { title: 'Doomsday' },
        { candidates: ['doomsdayband', 'metal'], relays: ['a'] }
      )
    ).toEqual({ status: 'free', qualifier: 'metal' });
  });

  it('stays taken when no candidate is free', async () => {
    taken(['doomsday-musician', 'doomsday-metal-musician']);
    expect(
      await checkEntitySlug(
        manifest,
        { title: 'Doomsday' },
        { candidates: ['metal'], relays: ['a'] }
      )
    ).toEqual({ status: 'taken', qualifier: '' });
  });
});
