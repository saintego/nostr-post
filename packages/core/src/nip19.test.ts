import { describe, expect, it } from 'vitest';
import {
  decodeLnurl,
  decodeNaddr,
  decodeProfile,
  encodeLnurl,
  encodeNaddr,
  encodeNevent,
} from './nip19';

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

describe('nevent / naddr with relays', () => {
  // Both decoded by nostr-tools to the same id/address, relay, author and kind
  it('encodes an nevent with relay, author and kind', () => {
    expect(
      encodeNevent('a'.repeat(64), { relays: ['wss://r.x.com'], author: pubkey, kind: 31923 })
    ).toBe(
      'nevent1qqs242424242424242424242424242424242424242424242424242spp4mhxue69uhhytnc9e3k7mgzyp4pnjymy62txpa2umwyqftzvsr353aa4kya3hdwd5dtwyu6jsq46qcyqqq8evcuq3l79'
    );
    expect(encodeNevent('not-an-id')).toBeUndefined();
  });

  it('encodes an naddr with a relay, still read back as the address', () => {
    const naddr = encodeNaddr(`31923:${pubkey}:gig`, ['wss://r.x.com']);
    expect(naddr).toBe(
      'naddr1qqpkw6t8qyxhwumn8ghj7u3w0qhxxmmdqgsx5xwgnvnffvc84tndcsp9vfjqwxj8hkkcnkxa4ek34dcnn22qzhgrqsqqql9nrapam2'
    );
    expect(decodeNaddr(naddr ?? '')).toBe(`31923:${pubkey}:gig`);
  });
});

describe('LNURL', () => {
  // The example of LUD-01
  const lnurl =
    'LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0V9CXJ0M385EKVCENXC6R2C35XVUKXEFCV5MKVV34X5EKZD3EV56NYD3HXQURZEPEXEJXXEPNXSCRVWFNV9NXZCN9XQ6XYEFHVGCXXCMYXYMNSERXFQ5FNS';
  const url =
    'https://service.com/api?q=3fc3645b439ce8e7f2553a69e5267081d96dcd340693afabe04be7b0ccd178df';

  it('decodes an LNURL, also with lightning: before it', () => {
    expect(decodeLnurl(lnurl)).toBe(url);
    expect(decodeLnurl(`lightning:${lnurl.toLowerCase()}`)).toBe(url);
  });

  it('encodes a URL as an LNURL', () => {
    expect(encodeLnurl(url)).toBe(lnurl);
  });

  it('rejects other entities and http URLs', () => {
    expect(
      decodeLnurl('npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq')
    ).toBeUndefined();
    expect(decodeLnurl(encodeLnurl('http://service.com/api'))).toBeUndefined();
    expect(decodeLnurl(encodeLnurl('http://abc.onion/api'))).toBe('http://abc.onion/api');
  });
});
