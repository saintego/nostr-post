import { describe, expect, it } from 'vitest';
import { encodeNpub } from './nip19';
import { applyCompletion, completionAt } from './textCompletion';

describe('completionAt', () => {
  it('finds the word typed after the trigger', () => {
    expect(completionAt('hi @ali', 7, '@')).toEqual({ start: 3, end: 7, query: 'ali' });
    expect(completionAt('@', 1, '@')).toEqual({ start: 0, end: 1, query: '' });
    expect(completionAt('(@bob', 5, '@')).toEqual({ start: 1, end: 5, query: 'bob' });
  });

  it('ignores e-mail addresses, finished words and text past the caret', () => {
    expect(completionAt('me@example', 10, '@')).toBeUndefined();
    expect(completionAt('@alice and', 10, '@')).toBeUndefined();
    expect(completionAt('@alice', 0, '@')).toBeUndefined();
  });
});

describe('applyCompletion', () => {
  it('replaces the match and puts the caret after a space', () => {
    const match = { start: 3, end: 7, query: 'ali' };
    expect(applyCompletion('hi @ali', match, 'nostr:npub1x')).toEqual({
      text: 'hi nostr:npub1x ',
      caret: 16,
    });
    expect(applyCompletion('hi @ali there', match, 'X')).toEqual({ text: 'hi X there', caret: 5 });
  });
});

describe('encodeNpub', () => {
  it('encodes a hex pubkey', () => {
    expect(encodeNpub('3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d')).toBe(
      'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6'
    );
    expect(encodeNpub('xyz')).toBeUndefined();
  });
});
