import { encodeNaddr } from '@nostr-post/core/nip19';
import { tokenizeNoteContent } from '@nostr-post/core/noteContent';
import { registerKindView } from '@nostr-post/plugins/entities';
import { describe, expect, it } from 'vitest';
import { renderNoteContent } from './viewContent';

/** A template's text, nested templates and static tag names included */
const text = (part: unknown): string => {
  if (Array.isArray(part)) return part.map(text).join('');
  if (part && typeof part === 'object' && 'strings' in part && 'values' in part) {
    const { strings, values } = part as { strings: readonly string[]; values: unknown[] };
    return strings.map((s, i) => s + (i < values.length ? text(values[i]) : '')).join('');
  }
  if (part && typeof part === 'object' && 'r' in part) return String((part as { r: unknown }).r);
  return part === undefined || part === null ? '' : String(part);
};

describe('linked events in note text', () => {
  const list = `30003:${'a'.repeat(64)}:nostr-post:want-to-go`;
  const calendarEvent = `31923:${'a'.repeat(64)}:gig`;

  it("shows a registered kind's view, and a link for other kinds", () => {
    registerKindView({ kinds: [30003], tagName: 'test-list-view' });
    const content = `See nostr:${encodeNaddr(list)} and nostr:${encodeNaddr(calendarEvent)}`;
    const rendered = text(renderNoteContent(tokenizeNoteContent(content)));
    expect(rendered).toContain('<test-list-view');
    expect(rendered).toContain('class="note-link"');
  });
});
