// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { clearPublicKeyCache, getPublicKey } from './index';

describe('getPublicKey', () => {
  it('asks the signer once, also for callers at the same time, until cleared', async () => {
    const ask = vi.fn(async () => 'pk');
    window.nostr = { getPublicKey: ask, signEvent: vi.fn() as never };
    expect(await Promise.all([getPublicKey(), getPublicKey()])).toEqual(['pk', 'pk']);
    await getPublicKey();
    expect(ask).toHaveBeenCalledTimes(1);

    clearPublicKeyCache();
    await getPublicKey();
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('asks again after a failed request, and asks a new signer', async () => {
    clearPublicKeyCache();
    const failing = vi.fn().mockRejectedValueOnce(new Error('rejected')).mockResolvedValue('pk');
    window.nostr = { getPublicKey: failing, signEvent: vi.fn() as never };
    await expect(getPublicKey()).rejects.toThrow('rejected');
    expect(await getPublicKey()).toBe('pk');

    window.nostr = { getPublicKey: async () => 'other', signEvent: vi.fn() as never };
    expect(await getPublicKey()).toBe('other');
  });
});
