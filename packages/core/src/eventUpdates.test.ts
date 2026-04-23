/**
 * Unit tests for eventUpdates utilities
 */
import { describe, expect, it } from 'vitest';
import { applyUpdateCommentsToEvent, isUpdateComment, parseUpdateComment } from './eventUpdates';
import type { DisplayableEvent, NostrPostManifest } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PUBKEY = 'aaaa';
const OTHER_PUBKEY = 'bbbb';

const makeEvent = (overrides: Partial<DisplayableEvent> = {}): DisplayableEvent => ({
  kind: 1,
  pubkey: PUBKEY,
  created_at: 1000,
  tags: [],
  content: 'original content',
  ...overrides,
});

/** Minimal manifest with one content field and one tag field */
const MANIFEST: NostrPostManifest = {
  id: 'test-v1',
  version: '1.0.0',
  publishFormats: [{ id: 'note', label: 'Note', kinds: [1], default: true }],
  fields: [
    {
      id: 'review',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 1, target: 'content' },
    },
    {
      id: 'rating',
      type: 'number',
      uiPlugin: 'stars',
      mapTo: { kind: 1, target: 'tag', tagName: 'rating' },
    },
  ],
};

const interactionEvent = (
  content: string,
  overrides: Partial<DisplayableEvent> = {}
): DisplayableEvent => makeEvent({ kind: 1, content, created_at: 2000, ...overrides });

// ---------------------------------------------------------------------------
// parseUpdateComment
// ---------------------------------------------------------------------------

describe('parseUpdateComment', () => {
  it('parses a basic update line', () => {
    expect(parseUpdateComment('update:review:new text')).toEqual({
      fieldId: 'review',
      rawValue: 'new text',
    });
  });

  it('is case-insensitive', () => {
    expect(parseUpdateComment('UPDATE:review:value')).toBeDefined();
    expect(parseUpdateComment('Update : review : value')).toBeDefined();
  });

  it('trims whitespace from fieldId and value', () => {
    const result = parseUpdateComment('update : review : new text ');
    expect(result?.fieldId).toBe('review');
    expect(result?.rawValue).toBe('new text');
  });

  it('allows colons in the value', () => {
    const result = parseUpdateComment('update:review:value:with:colons');
    expect(result?.rawValue).toBe('value:with:colons');
  });

  it('returns undefined for non-update lines', () => {
    expect(parseUpdateComment('just a comment')).toBeUndefined();
    expect(parseUpdateComment('update without colons')).toBeUndefined();
    expect(parseUpdateComment('')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isUpdateComment
// ---------------------------------------------------------------------------

describe('isUpdateComment', () => {
  it('returns true when every non-empty line is an update line', () => {
    expect(isUpdateComment('update:review:hello\nupdate:rating:4')).toBe(true);
  });

  it('returns false when any line is not an update line', () => {
    expect(isUpdateComment('update:review:hello\nplain text')).toBe(false);
  });

  it('ignores blank lines', () => {
    expect(isUpdateComment('update:review:hello\n\nupdate:rating:5')).toBe(true);
  });

  it('returns false for empty content', () => {
    expect(isUpdateComment('')).toBe(false);
    expect(isUpdateComment('   ')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyUpdateCommentsToEvent
// ---------------------------------------------------------------------------

describe('applyUpdateCommentsToEvent', () => {
  it('returns event unchanged when no interaction events provided', () => {
    const event = makeEvent();
    expect(applyUpdateCommentsToEvent(event, MANIFEST, [])).toBe(event);
    expect(applyUpdateCommentsToEvent(event, MANIFEST, undefined)).toBe(event);
  });

  it('returns event unchanged when no manifest provided', () => {
    const event = makeEvent();
    const ie = interactionEvent('update:review:new');
    expect(applyUpdateCommentsToEvent(event, undefined, [ie])).toBe(event);
  });

  it('applies a content update from a same-author update comment', () => {
    const event = makeEvent({ content: 'old review' });
    const ie = interactionEvent('update:review:new review');
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie]);
    expect(result.content).toBe('new review');
  });

  it('applies a tag update from a same-author update comment', () => {
    const event = makeEvent({ tags: [['rating', '3']] });
    const ie = interactionEvent('update:rating:5');
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie]);
    const ratingTag = result.tags.find((t) => t[0] === 'rating');
    expect(ratingTag?.[1]).toBe('5');
  });

  it('ignores update comments from a different author (security guard)', () => {
    const event = makeEvent();
    const ie = interactionEvent('update:review:injected', { pubkey: OTHER_PUBKEY });
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie]);
    expect(result).toBe(event);
  });

  it('ignores non-update-comment events even from the same author', () => {
    const event = makeEvent();
    const ie = interactionEvent('just a normal reply', { pubkey: PUBKEY });
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie]);
    expect(result).toBe(event);
  });

  it('applies multiple update events in chronological order', () => {
    const event = makeEvent({ content: 'v0' });
    const ie1 = interactionEvent('update:review:v1', { created_at: 1001 });
    const ie2 = interactionEvent('update:review:v2', { created_at: 1002 });
    // Pass in reverse order to verify sorting
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie2, ie1]);
    expect(result.content).toBe('v2');
  });

  it('applies multi-line update comment (multiple fields in one event)', () => {
    const event = makeEvent({ content: 'old', tags: [['rating', '1']] });
    const ie = interactionEvent('update:review:new\nupdate:rating:5');
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie]);
    expect(result.content).toBe('new');
    const ratingTag = result.tags.find((t) => t[0] === 'rating');
    expect(ratingTag?.[1]).toBe('5');
  });

  it('ignores update lines for unknown field IDs', () => {
    const event = makeEvent({ content: 'original' });
    const ie = interactionEvent('update:nonexistent:value');
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie]);
    expect(result.content).toBe('original');
  });

  it('ignores update lines from non-kind-1 interaction events', () => {
    const event = makeEvent();
    const ie = interactionEvent('update:review:new', { kind: 7 });
    const result = applyUpdateCommentsToEvent(event, MANIFEST, [ie]);
    expect(result).toBe(event);
  });
});
