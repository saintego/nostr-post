import { describe, expect, it } from 'vitest';
import { checkSuggestedLinks, keepKnownLinks, linksInText } from './linkGuard';

const answer = (status: number, body: unknown = {}) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('linksInText', () => {
  it('finds links with or without a scheme and @ mentions, as profiles', () => {
    const keys = linksInText('Live! doomsday.bandcamp.com/album/x and @doomsday_band');
    expect(keys.has('https://doomsday.bandcamp.com')).toBe(true);
    expect(keys.has('https://www.instagram.com/doomsday_band')).toBe(true);
  });
});

describe('keepKnownLinks', () => {
  const text = 'Tonight: https://www.instagram.com/doomsday';

  it('keeps links the text has, however written, and drops made-up ones', () => {
    const value = {
      title: 'Gig',
      media: ['https://instagram.com/Doomsday/', 'https://made-up.example.com'],
      site: 'https://made-up.example.com',
    };
    expect(keepKnownLinks(value, text)).toEqual({
      value: { title: 'Gig', media: ['https://instagram.com/Doomsday/'], site: null },
      fromImage: [],
    });
  });

  it('with an image, keeps links that cannot be checked and lists them', () => {
    const value = { media: ['https://other.example.com', 'https://youtu.be/dQw4w9WgXcQ'] };
    expect(keepKnownLinks(value, text, { hasImage: true })).toEqual({
      value: { media: ['https://other.example.com'] },
      fromImage: ['https://other.example.com'],
    });
  });

  it('keeps links the user confirmed', () => {
    const link = 'https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF';
    expect(keepKnownLinks([link], '', { confirmed: [link] }).value).toEqual([link]);
  });
});

describe('checkSuggestedLinks', () => {
  const spotify = 'https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF';

  it('ticks links their provider knows by the name, leaves others and uncheckable ones', async () => {
    const suggestions = await checkSuggestedLinks(
      [
        { name: 'Band of Horses', link: spotify },
        { name: 'Band of Horses', link: 'https://bandofhorses.bandcamp.com' },
      ],
      '',
      { fetchFn: answer(200, { title: 'Band of Horses' }) }
    );
    expect(suggestions).toEqual([
      { name: 'Band of Horses', link: spotify, names: ['Band of Horses'], checked: true },
      {
        name: 'Band of Horses',
        link: 'https://bandofhorses.bandcamp.com',
        names: [],
        checked: false,
      },
    ]);
    const other = await checkSuggestedLinks([{ name: 'Someone Else', link: spotify }], '', {
      fetchFn: answer(200, { title: 'Band of Horses' }),
    });
    expect(other).toEqual([
      { name: 'Someone Else', link: spotify, names: ['Band of Horses'], checked: false },
    ]);
    const missing = await checkSuggestedLinks([{ name: 'Band of Horses', link: spotify }], '', {
      fetchFn: answer(404, {}),
    });
    expect(missing).toEqual([]);
  });
});
