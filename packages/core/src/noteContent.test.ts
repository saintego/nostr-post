import { describe, expect, it } from 'vitest';
import {
  imetaMediaTypes,
  isShownInNote,
  mentionedPubkeys,
  mentionRelayHints,
  tokenizeNoteContent,
} from './noteContent';

const authorHex = '6a19c89b2694b307aae6dc40256264071a47bdad89d8ddae6d1ab7139a94015d';
const blossom = 'https://npub1x.blossom.band/376fa6f2';

describe('tokenizeNoteContent', () => {
  it('splits text, links, hashtags and nostr references in order', () => {
    const npub = 'npub1dgvu3xexjjes02hxm3qz2cnyqudy00dd38vdmtndr2m38x55q9wss4r3ue';
    expect(
      tokenizeNoteContent(`Hi https://example.com/a, see nostr:${npub} #Nostr #web-dev.`)
    ).toEqual([
      { type: 'text', text: 'Hi ' },
      { type: 'url', url: 'https://example.com/a', media: undefined },
      { type: 'text', text: ', see ' },
      { type: 'nostr', uri: `nostr:${npub}`, id: npub, pubkey: authorHex, relays: [] },
      { type: 'text', text: ' ' },
      { type: 'hashtag', tag: 'Nostr' },
      { type: 'text', text: ' ' },
      { type: 'hashtag', tag: 'web-dev' },
      { type: 'text', text: '.' },
    ]);
  });

  it('classifies media by extension and by imeta mime type', () => {
    const tags = [['imeta', `url ${blossom}`, 'm image/jpeg']];
    const tokens = tokenizeNoteContent(
      `${blossom} https://x.com/v.mp4 https://x.com/p.PNG?w=2`,
      tags
    );
    expect(tokens.filter((t) => t.type === 'url')).toEqual([
      { type: 'url', url: blossom, media: 'image' },
      { type: 'url', url: 'https://x.com/v.mp4', media: 'video' },
      { type: 'url', url: 'https://x.com/p.PNG?w=2', media: 'image' },
    ]);
  });

  it('does not take URL fragments or HTML entities as hashtags', () => {
    const tokens = tokenizeNoteContent('https://x.com/#section a&#39;b x#y');
    expect(tokens.some((t) => t.type === 'hashtag')).toBe(false);
  });
});

describe('imetaMediaTypes', () => {
  it('maps imeta urls to image or video', () => {
    const types = imetaMediaTypes([
      ['imeta', 'url https://a/1', 'm video/mp4'],
      ['imeta', 'url https://a/2'],
      ['r', 'https://a/3'],
    ]);
    expect([...types]).toEqual([
      ['https://a/1', 'video'],
      ['https://a/2', 'image'],
    ]);
  });
});

describe('isShownInNote', () => {
  const tokens = tokenizeNoteContent(`${blossom} #TypeScript https://npmjs.com/x`);

  it('finds URLs and hashtags case-insensitively', () => {
    expect(isShownInNote(tokens, blossom)).toBe(true);
    expect(isShownInNote(tokens, 'typescript')).toBe(true);
    expect(isShownInNote(tokens, 'https://npmjs.com/x')).toBe(true);
  });

  it('keeps tag values the text does not show', () => {
    expect(isShownInNote(tokens, 'https://other.com')).toBe(false);
    expect(isShownInNote(tokens, 'react')).toBe(false);
  });
});

describe('mentionedPubkeys', () => {
  it('lists each mentioned profile once, not notes or addresses', () => {
    const npub = 'npub1dgvu3xexjjes02hxm3qz2cnyqudy00dd38vdmtndr2m38x55q9wss4r3ue';
    const tokens = tokenizeNoteContent(`nostr:${npub} hi nostr:${npub} nostr:note1abc`);
    expect(mentionedPubkeys(tokens)).toEqual([authorHex]);
  });
});

describe('mentionRelayHints', () => {
  it('collects the relay hints of nprofile mentions', () => {
    const nprofile =
      'nprofile1qyxhwumn8ghj7u3w0qhxxmmdqqsx5xwgnvnffvc84tndcsp9vfjqwxj8hkkcnkxa4ek34dcnn22qzhgzhmn5m';
    const tokens = tokenizeNoteContent(`nostr:${nprofile} and nostr:${nprofile}`);
    expect(mentionRelayHints(tokens)).toEqual(['wss://r.x.com']);
  });
});
