import { describe, expect, it } from 'vitest';
import { dateValueFromTags } from './core';
import { dateDisplay } from './dateDisplay';

// A gig in Berlin, 19:00–22:00 on Nov 20, 2026 (CET, UTC+1)
const start = String(Date.UTC(2026, 10, 20, 18) / 1000);
const end = String(Date.UTC(2026, 10, 20, 21) / 1000);

describe('dateDisplay', () => {
  it("reads in the event's zone, with the viewer's time when theirs is another", () => {
    const value = dateValueFromTags([
      ['start', start],
      ['end', end],
      ['start_tzid', 'Europe/Berlin'],
    ]);
    if (!value) throw new Error('no value');
    const shown = dateDisplay(value, { locale: 'en-US', viewerZone: 'Asia/Bangkok' });
    expect(shown.zone).toBe('Europe/Berlin');
    expect(shown.text).toMatch(/7:00\sPM.*10:00\sPM/);
    expect(shown.viewerText).toMatch(/Nov 21, 2026, 1:00\sAM.*4:00\sAM/);
  });

  it('has no second line for a zone with the same clock', () => {
    const value = { start: '2026-11-20T19:00', tzid: 'Europe/Berlin' };
    expect(dateDisplay(value, { locale: 'en-US', viewerZone: 'Europe/Paris' }).viewerText).toBe(
      undefined
    );
  });

  it("says a timed event without start_tzid is in the viewer's zone", () => {
    const value = dateValueFromTags([['start', start]]);
    expect(value?.tzid).toBeUndefined();
    if (!value) throw new Error('no value');
    // Read in the runtime's zone, which is the viewer's
    const shown = dateDisplay(value, { locale: 'en-US' });
    expect(shown.inViewerZone).toBe(true);
    expect(shown.zone).toBeUndefined();
    expect(shown.viewerText).toBeUndefined();
  });

  it('guesses the zone of a timed event without start_tzid from its place, and says so', () => {
    // A bridged Berlin gig: a geohash and a country, no start_tzid
    const value = dateValueFromTags([
      ['start', start],
      ['g', 'u33dc0'],
      ['i', 'iso3166:DE'],
    ]);
    expect(value).toMatchObject({
      start: '2026-11-20T19:00',
      tzid: 'Europe/Berlin',
      zoneGuessed: true,
    });
    if (!value) throw new Error('no value');
    const shown = dateDisplay(value, { locale: 'en-US', viewerZone: 'Asia/Bangkok' });
    expect(shown).toMatchObject({ zone: 'Europe/Berlin', zoneGuessed: true, inViewerZone: false });
    expect(shown.text).toMatch(/7:00\sPM/);
    expect(shown.viewerText).toMatch(/1:00\sAM/);
  });

  it('shows calendar dates without zones', () => {
    expect(dateDisplay({ start: '2026-11-20' }, { locale: 'en-US' })).toEqual({
      text: 'Nov 20, 2026',
      inViewerZone: false,
    });
  });
});
