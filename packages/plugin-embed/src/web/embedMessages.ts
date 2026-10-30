import type { EmbedProvider } from '../core';

/**
 * User-facing text of <np-embed>, <np-embed-view> and <np-embed-input>. Apps can override any
 * of it with the components' `messages` property (e.g. for translations).
 */
export interface EmbedMessages {
  /** The button that loads a player; the provider's name follows */
  play: (provider: string) => string;
  /** Says the player comes from the provider (loading it contacts them) */
  loadsFrom: (provider: string) => string;
  providers: Record<EmbedProvider, string>;
  placeholder: string;
  addLink: string;
  remove: string;
  /** Under a Bandcamp page link, which gets no player */
  bandcampHint: string;
}

export const DEFAULT_EMBED_MESSAGES: EmbedMessages = {
  play: (provider) => `▶ Play on ${provider}`,
  loadsFrom: (provider) => `Loads the player from ${provider}`,
  providers: {
    youtube: 'YouTube',
    spotify: 'Spotify',
    soundcloud: 'SoundCloud',
    vimeo: 'Vimeo',
    bandcamp: 'Bandcamp',
  },
  placeholder: 'https://… (YouTube, Spotify, SoundCloud, Bandcamp, any link)',
  addLink: 'Add link',
  remove: 'Remove',
  bandcampHint:
    "For a player, paste Bandcamp's embed code instead (on the album's page: Share / Embed)",
};
