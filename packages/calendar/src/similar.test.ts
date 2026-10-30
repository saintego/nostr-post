import { describe, expect, it } from 'vitest';
import { similarEvents, titleSimilarity } from './similar';

const event = (d: string, title: string, start: string) => ({
  kind: 31922,
  pubkey: 'a'.repeat(64),
  created_at: 1,
  tags: [
    ['d', d],
    ['title', title],
    ['start', start],
  ],
});

describe('titleSimilarity', () => {
  it('compares words, ignoring case, accents, punctuation and filler', () => {
    expect(titleSimilarity('Doomsday Ceremony', 'DOOMSDAY CEREMONY - Medellín')).toBe(1);
    expect(titleSimilarity('Noche de Metal en Envigado', 'noche metal envigado')).toBe(1);
    expect(titleSimilarity('Doomsday Ceremony', 'Punk night')).toBe(0);
    expect(titleSimilarity('the', 'the')).toBe(0);
  });
});

describe('similarEvents', () => {
  const events = [
    event('a', 'DOOMSDAY CEREMONY live', '2026-09-20'),
    event('b', 'Doomsday Ceremony', '2026-09-27'),
    event('c', 'Jazz brunch', '2026-09-20'),
    event('d', 'Ceremony of doom fest', '2026-09-20'),
  ];

  it('finds events on the same day with a similar title, most alike first', () => {
    const found = similarEvents(
      { title: 'Doomsday Ceremony', when: { start: '2026-09-20' } },
      events
    );
    expect(found.map((f) => f.event.tags[0]?.[1])).toEqual(['a', 'd']);
    expect(found[0]?.score).toBe(1);
  });

  it('respects the minimum score', () => {
    const found = similarEvents(
      { title: 'Doomsday Ceremony', when: { start: '2026-09-20' } },
      events,
      { minScore: 0.9 }
    );
    expect(found.map((f) => f.event.tags[0]?.[1])).toEqual(['a']);
  });
});
