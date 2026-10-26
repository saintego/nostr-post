import { describe, expect, it } from 'vitest';
import { agendaFilters } from './agendaQuery';

const author = 'b'.repeat(64);
const window = { from: '2026-10-21', days: 1, tzid: 'UTC' };

describe('agendaFilters', () => {
  it("asks for calendar events with the window's day tags, an area and a genre", () => {
    expect(agendaFilters({ window, tagFilters: { '#g': ['u09t'], '#t': ['punk'] } })).toEqual([
      { kinds: [31922, 31923], limit: 500, '#g': ['u09t'], '#t': ['punk'], '#D': ['20747'] },
    ]);
  });

  it("asks a calendar's events by address, whatever their tags", () => {
    const items = [`31922:${author}:fest`, `31923:${author}:talk`, `31923:${author}:meetup`];
    expect(agendaFilters({ window, calendarItems: items })).toEqual([
      { kinds: [31922], authors: [author], '#d': ['fest'] },
      { kinds: [31923], authors: [author], '#d': ['talk', 'meetup'] },
    ]);
    expect(agendaFilters({ window, calendarItems: [] })).toEqual([]);
  });
});
