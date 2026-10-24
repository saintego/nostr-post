import { coordinateEvents } from '@nostr-post/core/coordinator';
import { validateManifest } from '@nostr-post/core/manifest';
import type { PostField } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { CALENDAR_EVENT_MANIFEST } from './calendarManifest';
import { datePlugin } from './core';

const config = {
  pubkey: 'a'.repeat(64),
  dTag: 'meetup',
  tagSerializer: (value: unknown, field: PostField) =>
    field.uiPlugin === 'date' ? datePlugin.serializeValue?.(value, field) : undefined,
  extraTagsFn: (value: unknown, field: PostField) =>
    field.uiPlugin === 'date' ? datePlugin.extraTags?.(value, field) : undefined,
};

const formData = {
  title: 'Nostr meetup',
  when: { start: '2026-10-21T19:00', end: '2026-10-21T21:00', tzid: 'Europe/Prague' },
  description: 'Talks and beer',
  summary: 'Monthly meetup',
  tags: ['nostr', 'meetup'],
};

describe('CALENDAR_EVENT_MANIFEST', () => {
  it('is a valid manifest', () => {
    expect(validateManifest(CALENDAR_EVENT_MANIFEST).success).toBe(true);
  });

  it('publishes an all-day event by default', () => {
    const result = coordinateEvents(CALENDAR_EVENT_MANIFEST, formData, config);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    expect(result.data.events).toHaveLength(1);
    const [event] = result.data.events;
    expect(event?.kind).toBe(31922);
    expect(event?.content).toBe('Talks and beer');
    expect(event?.tags).toEqual(
      expect.arrayContaining([
        ['d', 'meetup'],
        ['title', 'Nostr meetup'],
        ['summary', 'Monthly meetup'],
        ['start', '2026-10-21'],
        ['t', 'nostr'],
        ['t', 'meetup'],
      ])
    );
  });

  it('writes the free-text place and the link as NIP-52 location and r tags', () => {
    const result = coordinateEvents(
      CALENDAR_EVENT_MANIFEST,
      { ...formData, place: 'Online', link: 'https://meet.example/abc' },
      config
    );
    if (!result.success) throw new Error(JSON.stringify(result.error));
    expect(result.data.events[0]?.tags).toEqual(
      expect.arrayContaining([
        ['location', 'Online'],
        ['r', 'https://meet.example/abc'],
      ])
    );
  });

  it('writes participants as NIP-52 p tags with their role', () => {
    const host = 'c'.repeat(64);
    const config2 = {
      ...config,
      tagSerializer: (value: unknown, field: PostField) =>
        field.uiPlugin === 'profile' ? '' : config.tagSerializer(value, field),
      extraTagsFn: (value: unknown, field: PostField) =>
        field.uiPlugin === 'profile'
          ? (value as { pubkey: string; role?: string }[]).map((p): [string, ...string[]] => [
              'p',
              p.pubkey,
              '',
              p.role ?? '',
            ])
          : config.extraTagsFn(value, field),
    };
    const result = coordinateEvents(
      CALENDAR_EVENT_MANIFEST,
      { ...formData, participants: [{ pubkey: host, role: 'host' }] },
      config2
    );
    if (!result.success) throw new Error(JSON.stringify(result.error));
    expect(result.data.events[0]?.tags).toContainEqual(['p', host, '', 'host']);
  });

  it('publishes a timed event with the timed format', () => {
    const result = coordinateEvents(CALENDAR_EVENT_MANIFEST, formData, {
      ...config,
      selectedFormatId: 'timed',
    });
    if (!result.success) throw new Error(JSON.stringify(result.error));
    const [event] = result.data.events;
    expect(event?.kind).toBe(31923);
    expect(event?.tags).toEqual(
      expect.arrayContaining([
        ['title', 'Nostr meetup'],
        ['start', String(Date.UTC(2026, 9, 21, 17) / 1000)],
        ['start_tzid', 'Europe/Prague'],
      ])
    );
  });

  it('needs a title and a date', () => {
    const { title: _title, ...noTitle } = formData;
    expect(coordinateEvents(CALENDAR_EVENT_MANIFEST, noTitle, config).success).toBe(false);
    const { when: _when, ...noDate } = formData;
    expect(coordinateEvents(CALENDAR_EVENT_MANIFEST, noDate, config).success).toBe(false);
  });
});
