import { describe, expect, it } from 'vitest';
import { linkFromEmbedCode } from './core';
import { checkLink, isCheckableLink, namesMatch } from './linkCheck';

const answer = (status: number, body: unknown = {}) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('isCheckableLink', () => {
  it('knows Spotify, SoundCloud (profiles too) and YouTube videos', () => {
    expect(isCheckableLink('https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF')).toBe(true);
    expect(isCheckableLink('https://soundcloud.com/doomsday')).toBe(true);
    expect(isCheckableLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it("can't ask about channels, playlists and other sites", () => {
    expect(isCheckableLink('https://www.youtube.com/@doomsday')).toBe(false);
    expect(isCheckableLink('https://www.youtube.com/playlist?list=PL123456')).toBe(false);
    expect(isCheckableLink('https://doomsday.bandcamp.com')).toBe(false);
    expect(isCheckableLink('https://www.instagram.com/doomsday')).toBe(false);
  });
});

describe('checkLink', () => {
  const link = 'https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF';

  it("gives a found link's names", async () => {
    const fetchFn = answer(200, { title: 'Band of Horses', provider_name: 'Spotify' });
    expect(await checkLink(link, fetchFn)).toEqual({ status: 'found', names: ['Band of Horses'] });
  });

  it('says a link is missing on 404', async () => {
    expect(await checkLink(link, answer(404))).toEqual({ status: 'missing' });
  });

  it("doesn't know when the provider fails or can't be asked", async () => {
    expect(await checkLink(link, answer(500))).toEqual({ status: 'unknown' });
    const failing = (async () => {
      throw new TypeError('network');
    }) as unknown as typeof fetch;
    expect(await checkLink(link, failing)).toEqual({ status: 'unknown' });
    expect(await checkLink('https://x.bandcamp.com', answer(200))).toEqual({ status: 'unknown' });
  });
});

describe('namesMatch', () => {
  it('ignores case, accents, spaces and punctuation', () => {
    expect(namesMatch('Brain Rage', ['brainrage'])).toBe(true);
    expect(namesMatch('Motörhead', ['Motorhead'])).toBe(true);
  });

  it("finds the name as a whole part of a video's title", () => {
    expect(namesMatch('Naraka', ['Some Channel', 'NARAKA - Live at JAM (2025)'])).toBe(true);
  });

  it('rejects other names', () => {
    expect(namesMatch('Naraka', ['Narakan Sound'])).toBe(false);
    expect(namesMatch('Anarch', ['Anarchy - Live'])).toBe(false);
  });
});

describe('linkFromEmbedCode', () => {
  it('takes the player link from an iframe, other text as it is', () => {
    expect(
      linkFromEmbedCode(
        '<iframe style="border: 0;" src="https://bandcamp.com/EmbeddedPlayer/album=123/size=large/" seamless></iframe>'
      )
    ).toBe('https://bandcamp.com/EmbeddedPlayer/album=123/size=large/');
    expect(linkFromEmbedCode('https://x.bandcamp.com')).toBe('https://x.bandcamp.com');
  });
});
