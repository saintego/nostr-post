import { describe, expect, it } from 'vitest';
import {
  isCalendarEventAddress,
  peopleByStatus,
  rsvpEvent,
  rsvpFilter,
  summarizeRsvps,
  withAnswer,
} from './rsvp';

const author = 'b'.repeat(64);
const address = `31923:${author}:meetup`;

describe('isCalendarEventAddress', () => {
  it('accepts calendar event addresses only', () => {
    expect(isCalendarEventAddress(address)).toBe(true);
    expect(isCalendarEventAddress(`31922:${author}:fest`)).toBe(true);
    expect(isCalendarEventAddress(`30818:${author}:page`)).toBe(false);
    expect(isCalendarEventAddress('a'.repeat(64))).toBe(false);
  });
});

describe('rsvpEvent', () => {
  it('answers with one replaceable RSVP per event', () => {
    const event = rsvpEvent(address, 'accepted', 'c'.repeat(64), { createdAt: 5 });
    expect(event).toEqual({
      kind: 31925,
      pubkey: 'c'.repeat(64),
      created_at: 5,
      content: '',
      tags: [
        ['d', address],
        ['a', address],
        ['status', 'accepted'],
        ['fb', 'busy'],
        ['p', author],
      ],
    });
  });

  it('leaves free/busy out of a decline', () => {
    const tags = rsvpEvent(address, 'declined', 'c'.repeat(64)).tags;
    expect(tags.some((tag) => tag[0] === 'fb')).toBe(false);
  });

  it('asks relays by the events addresses', () => {
    expect(rsvpFilter([address])).toEqual({ kinds: [31925], '#a': [address] });
  });
});

describe('summarizeRsvps / withAnswer', () => {
  const rsvp = (pubkey: string, status: string, createdAt: number, a = address) => ({
    pubkey,
    created_at: createdAt,
    tags: [
      ['a', a],
      ['status', status],
    ],
  });

  it("counts each person's newest answer to the event", () => {
    const summary = summarizeRsvps(
      [
        rsvp('x', 'accepted', 1),
        rsvp('x', 'declined', 2),
        rsvp('y', 'tentative', 1),
        rsvp('z', 'accepted', 1, `31923:${author}:other`),
        rsvp('w', 'maybe-later', 1),
      ],
      address
    );
    expect(summary.counts).toEqual({ accepted: 0, tentative: 1, declined: 1 });
    expect(summary.byPubkey.get('x')).toBe('declined');
  });

  it("sets the user's answer", () => {
    const summary = withAnswer(
      summarizeRsvps([rsvp('x', 'declined', 1)], address),
      'x',
      'accepted'
    );
    expect(summary.counts).toEqual({ accepted: 1, tentative: 0, declined: 0 });
  });

  it('lists who gave each answer', () => {
    const summary = summarizeRsvps(
      [rsvp('x', 'accepted', 1), rsvp('y', 'accepted', 1), rsvp('z', 'declined', 1)],
      address
    );
    expect(peopleByStatus(summary)).toEqual({
      accepted: ['x', 'y'],
      tentative: [],
      declined: ['z'],
    });
    expect(peopleByStatus(undefined)).toEqual({ accepted: [], tentative: [], declined: [] });
  });
});
