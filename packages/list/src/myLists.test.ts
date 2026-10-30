import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadMyLists, type MyListsState, NOT_LOADED, SIGNER_TIMEOUT_MS } from './myLists';

let answer: (pubkey: string) => void = () => {};

vi.mock('@nostr-post/signer', () => ({
  hasNostrSigner: () => true,
  getPublicKey: () => new Promise<string>((resolve) => (answer = resolve)),
  clearPublicKeyCache: vi.fn(),
}));
vi.mock('./lists', () => ({ fetchLists: async () => [] }));

const messages = { noSigner: 'no signer', signerNoAnswer: 'no answer', failed: (r: string) => r };

describe('loadMyLists', () => {
  afterEach(() => vi.useRealTimers());

  it("says the signer didn't answer, then loads when it answers late", async () => {
    vi.useFakeTimers();
    let state: MyListsState = NOT_LOADED;
    const done = loadMyLists(undefined, messages, (patch) => {
      state = { ...state, ...patch };
    });
    expect(state.waitingForSigner).toBe(true);

    await vi.advanceTimersByTimeAsync(SIGNER_TIMEOUT_MS);
    expect(state).toMatchObject({ waitingForSigner: false, error: 'no answer' });

    answer('me');
    await done;
    expect(state).toMatchObject({ pubkey: 'me', error: '', lists: [] });
  });
});
