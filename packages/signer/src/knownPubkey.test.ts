// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import {
  clearPublicKeyCache,
  getPublicKey,
  knownPublicKey,
  onKnownPublicKeyChange,
  setKnownPublicKey,
} from './index';

describe('knownPublicKey', () => {
  it("knows the signer's answer without asking again", async () => {
    setKnownPublicKey(undefined);
    clearPublicKeyCache();
    window.nostr = { getPublicKey: async () => 'pk', signEvent: vi.fn() as never };
    expect(knownPublicKey()).toBeUndefined();
    await getPublicKey();
    expect(knownPublicKey()).toBe('pk');
  });

  it("follows nostr-login's sign-in and sign-out, and tells listeners once per change", () => {
    setKnownPublicKey(undefined);
    const seen: (string | undefined)[] = [];
    const stop = onKnownPublicKeyChange((pubkey) => seen.push(pubkey));
    document.dispatchEvent(new CustomEvent('nlAuth', { detail: { type: 'login', pubkey: 'me' } }));
    setKnownPublicKey('me');
    expect(knownPublicKey()).toBe('me');
    document.dispatchEvent(new CustomEvent('nlAuth', { detail: { type: 'logout' } }));
    expect(knownPublicKey()).toBeUndefined();
    stop();
    setKnownPublicKey('other');
    expect(seen).toEqual(['me', undefined]);
  });
});
