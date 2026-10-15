import { describe, expect, it } from 'vitest';
import { decodeNaddr, decodeProfile, encodeNaddr } from './nip19';

const pubkey = '6a19c89b2694b307aae6dc40256264071a47bdad89d8ddae6d1ab7139a94015d';
const npub = 'npub1dgvu3xexjjes02hxm3qz2cnyqudy00dd38vdmtndr2m38x55q9wss4r3ue';

describe('decodeProfile', () => {
  it('reads the pubkey of an npub', () => {
    expect(decodeProfile(npub)).toEqual({ pubkey, relays: [] });
    expect(decodeProfile(npub.toUpperCase())?.pubkey).toBe(pubkey);
  });

  it('reads the pubkey and relay hints of an nprofile', () => {
    // Encoded by nostr-tools with relay wss://r.x.com
    const nprofile =
      'nprofile1qyxhwumn8ghj7u3w0qhxxmmdqqsx5xwgnvnffvc84tndcsp9vfjqwxj8hkkcnkxa4ek34dcnn22qzhgzhmn5m';
    expect(decodeProfile(nprofile)).toEqual({ pubkey, relays: ['wss://r.x.com'] });
  });

  it('rejects other entities and bad checksums', () => {
    const naddr = encodeNaddr(`30023:${pubkey}:post`) ?? '';
    expect(decodeProfile(naddr)).toBeUndefined();
    expect(decodeProfile(`${npub.slice(0, -1)}q`)).toBeUndefined();
    expect(decodeProfile('npub1')).toBeUndefined();
  });
});

describe('naddr', () => {
  it('round-trips an address', () => {
    const address = `30818:${pubkey}:u-fleků-prague`;
    expect(decodeNaddr(encodeNaddr(address) ?? '')).toBe(address);
  });

  it('rejects an npub', () => {
    expect(decodeNaddr(npub)).toBeUndefined();
  });
});
