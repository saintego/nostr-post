import type { PostField } from '@nostr-post/plugins/types';
import { describe, expect, it } from 'vitest';
import { embedFor, embedPlugin, linkProvider, linksOf } from './core';

describe('embedFor', () => {
  it('makes privacy-friendly YouTube players from any YouTube link', () => {
    const src = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    for (const link of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/shorts/dQw4w9WgXcQ',
      'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    ]) {
      expect(embedFor(link)).toEqual({ provider: 'youtube', src });
    }
    expect(embedFor('https://www.youtube.com/playlist?list=PL123')?.src).toBe(
      'https://www.youtube-nocookie.com/embed/videoseries?list=PL123'
    );
  });

  it('makes Spotify, SoundCloud and Vimeo players', () => {
    expect(embedFor('https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=x')).toEqual({
      provider: 'spotify',
      src: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
      height: 152,
    });
    expect(embedFor('https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF')?.height).toBe(352);
    expect(embedFor('https://soundcloud.com/band/sets/live-2026')).toEqual({
      provider: 'soundcloud',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent('https://soundcloud.com/band/sets/live-2026')}&visual=false`,
      height: 450,
    });
    expect(embedFor('https://vimeo.com/123456')?.src).toBe('https://player.vimeo.com/video/123456');
  });

  it('embeds Bandcamp only through its own player links; pages are just links', () => {
    const player = 'https://bandcamp.com/EmbeddedPlayer/album=1234567/size=large/';
    expect(embedFor(player)).toEqual({ provider: 'bandcamp', src: player, height: 472 });
    expect(embedFor('https://band.bandcamp.com/album/first')).toBeUndefined();
    expect(linkProvider('https://band.bandcamp.com/album/first')).toBe('bandcamp');
  });

  it('has no player for other links or non-links', () => {
    expect(embedFor('https://example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(embedFor('javascript:alert(1)')).toBeUndefined();
    expect(embedFor('not a link')).toBeUndefined();
    expect(embedFor('https://open.spotify.com/user/someone')).toBeUndefined();
  });
});

describe('embedPlugin', () => {
  const field: PostField = {
    id: 'media',
    type: 'string',
    uiPlugin: 'embed',
    mapTo: { kind: 30818, target: 'tag', tagName: 'r' },
  };

  it('accepts links only', () => {
    expect(embedPlugin.validate?.(['https://a.example', 'https://b.example'], field).success).toBe(
      true
    );
    expect(embedPlugin.validate?.('nope', field).success).toBe(false);
    expect(linksOf(['https://a.example', 'x', 3])).toEqual(['https://a.example']);
  });
});
