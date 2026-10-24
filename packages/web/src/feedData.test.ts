import { describe, expect, it } from 'vitest';
import { buildFeedFilters } from './feedData';

const author = 'b'.repeat(64);
const window = { from: '2026-10-21', days: 1, tzid: 'UTC' };

describe('buildFeedFilters', () => {
  it('asks for notes by default', () => {
    expect(buildFeedFilters({})).toMatchObject({ kinds: [1], limit: 20 });
  });

  it("asks an agenda for calendar events with the window's day tags", () => {
    expect(buildFeedFilters({ agenda: { window } })).toMatchObject({
      kinds: [31922, 31923],
      limit: 500,
      '#D': ['20747'],
    });
  });

  it("asks a calendar's agenda for its events by address, whatever their tags", () => {
    const items = [`31922:${author}:fest`, `31923:${author}:talk`, `31923:${author}:meetup`];
    expect(buildFeedFilters({ agenda: { window, calendarItems: items } })).toEqual([
      { kinds: [31922], authors: [author], '#d': ['fest'] },
      { kinds: [31923], authors: [author], '#d': ['talk', 'meetup'] },
    ]);
    expect(buildFeedFilters({ agenda: { window, calendarItems: [] } })).toEqual([]);
  });
});
