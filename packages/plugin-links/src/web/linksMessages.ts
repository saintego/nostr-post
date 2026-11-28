/**
 * User-facing text of <np-link>, <np-embed>, <np-links-view> and <np-links-input>, with English
 * defaults. Apps override any of it with the components' `messages` property (e.g. translations).
 */
export interface LinksMessages {
  /** The button that loads a player; the provider's name follows */
  play: (provider: string) => string;
  /** Says the player comes from the provider (loading it contacts them) */
  loadsFrom: (provider: string) => string;
  /** Providers' names by id (default: the rule's `name`) */
  providers: Record<string, string>;
  /** The ⋯ menu of a link */
  more: string;
  qrCode: string;
  copy: string;
  copied: string;
  share: string;
  open: string;
  /** The input */
  placeholder: string;
  addLink: string;
  /** Shows a saved link's text boxes instead of its preview */
  edit: string;
  done: string;
  /** Opens a link's label, icon and description boxes */
  details: string;
  remove: string;
  labelPlaceholder: string;
  iconPlaceholder: string;
  descriptionPlaceholder: string;
  /** Under a Bandcamp page link, which gets no player */
  bandcampHint: string;
}

export const DEFAULT_LINKS_MESSAGES: LinksMessages = {
  play: (provider) => `▶ Play on ${provider}`,
  loadsFrom: (provider) => `Loads the player from ${provider}`,
  providers: {},
  more: 'More',
  qrCode: 'QR code',
  copy: 'Copy link',
  copied: 'Copied',
  share: 'Share',
  open: 'Open',
  placeholder: 'A link: YouTube, Spotify, Ko-fi, any site (https:// may be left out)',
  addLink: 'Add link',
  edit: 'Edit',
  done: 'Done',
  details: 'Label and description',
  remove: 'Remove',
  labelPlaceholder: 'Label (optional)',
  iconPlaceholder: 'Emoji',
  descriptionPlaceholder: 'Description (optional)',
  bandcampHint:
    "For a player, paste Bandcamp's embed code instead (on the album's page: Share / Embed)",
};
