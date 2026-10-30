import { describe, expect, it } from 'vitest';
import { buildReplyTags } from './composerReply';
import { buildFeedFilters, interactionFilters } from './feedData';
import { buildReplyTarget, buildThreads } from './feedStandard';
import type { SignedEvent } from './signer';

const author = 'b'.repeat(64);

describe('buildFeedFilters', () => {
  it('asks for notes by default', () => {
    expect(buildFeedFilters({})).toMatchObject({ kinds: [1], limit: 20 });
  });
});

describe('comments on addressable events', () => {
  const sign = (e: Omit<SignedEvent, 'sig'>): SignedEvent => ({ ...e, sig: '' });
  const v1 = sign({
    id: '1'.repeat(64),
    kind: 31922,
    pubkey: author,
    created_at: 1,
    content: '',
    tags: [
      ['d', 'fest'],
      ['start', '2026-10-21'],
    ],
  });
  const v2 = sign({ ...v1, id: '2'.repeat(64), created_at: 2 });
  const address = `31922:${author}:fest`;

  it('replies name the root by address too', () => {
    const target = buildReplyTarget(v1);
    expect(target.rootAddress).toBe(address);
    expect(buildReplyTags(target)).toContainEqual(['a', address, '', 'root']);
  });

  it('threads a comment on an earlier version under the current one', () => {
    const comment = sign({
      id: '3'.repeat(64),
      kind: 1,
      pubkey: 'c'.repeat(64),
      created_at: 3,
      content: 'update:title:New',
      tags: buildReplyTags(buildReplyTarget(v1)),
    });
    const [thread] = buildThreads([v1, v2], [comment]);
    expect(thread?.root.id).toBe(v2.id);
    expect(thread?.replies.map((r) => r.id)).toEqual([comment.id]);
  });

  it('fetches comments by id and by address', () => {
    expect(interactionFilters([v2], { comments: true, reactions: true })).toEqual([
      { kinds: [1], '#e': [v2.id], limit: 50 },
      { kinds: [1], '#a': [address], limit: 50 },
      { kinds: [7], '#e': [v2.id], limit: 50 },
    ]);
  });
});
