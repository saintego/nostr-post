import { describe, expect, it } from 'vitest';
import { embedPlugin } from './core';
import { profileLink, profileUrls } from './profileLinks';

describe('profileLink', () => {
  it.each([
    ['https://doomsday.bandcamp.com/album/x', 'https://doomsday.bandcamp.com', 'doomsday'],
    [
      'http://m.facebook.com/DoomsdayBand/?ref=x',
      'https://www.facebook.com/doomsdayband',
      'doomsdayband',
    ],
    [
      'https://instagram.com/Doomsday.Ceremony/',
      'https://www.instagram.com/doomsday.ceremony',
      'doomsday.ceremony',
    ],
    ['https://soundcloud.com/doomsday/some-track', 'https://soundcloud.com/doomsday', 'doomsday'],
    ['https://www.youtube.com/@Doomsday/videos', 'https://www.youtube.com/@doomsday', 'doomsday'],
  ])('%s → %s', (link, url, handle) => {
    expect(profileLink(link)).toMatchObject({ url, handle });
  });

  it('keeps ids without a handle', () => {
    expect(
      profileLink('https://open.spotify.com/intl-es/artist/4Z8W4fKeB5YxbusRsdQVPb?si=1')
    ).toEqual({
      platform: 'spotify',
      url: 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb',
    });
    expect(profileLink('https://www.facebook.com/profile.php?id=1234&x=1')?.url).toBe(
      'https://www.facebook.com/profile.php?id=1234'
    );
    expect(profileLink('https://youtube.com/channel/UCabc-1')?.url).toBe(
      'https://www.youtube.com/channel/UCabc-1'
    );
  });

  it('ignores links that are not profiles', () => {
    for (const link of [
      'https://www.facebook.com/events/123',
      'https://www.instagram.com/p/abc',
      'https://open.spotify.com/album/1',
      'https://www.youtube.com/watch?v=abcdefgh',
      'https://example.com/band',
      'not a link',
    ]) {
      expect(profileLink(link)).toBeUndefined();
    }
  });
});

describe('profile links as i tags', () => {
  it('writes each profile once, in canonical form', () => {
    const links = [
      'https://doomsday.bandcamp.com/',
      'https://doomsday.bandcamp.com/track/a',
      'https://www.youtube.com/watch?v=abcdefgh',
    ];
    expect(profileUrls(links)).toEqual(['https://doomsday.bandcamp.com']);
    const field = {
      id: 'media',
      type: 'string' as const,
      uiPlugin: 'embed',
      mapTo: { kind: 30818, target: 'tag' as const, tagName: 'r' },
    };
    expect(embedPlugin.extraTags?.(links, field)).toEqual([['i', 'https://doomsday.bandcamp.com']]);
  });
});
