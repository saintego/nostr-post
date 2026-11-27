/**
 * User-facing text of the `links` field's view and input, with English defaults. Apps override
 * any of it with the `messages` property (e.g. translations).
 */
export interface LinksMessages {
  /** The input's choice of an entry's type, and the types */
  type: string;
  typeLink: string;
  typeBitcoin: string;
  typeNote: string;
  /** Default label of a Bitcoin address */
  bitcoin: string;
  /** Line under the Bitcoin name */
  bitcoinDescription: string;
  /** A link's button: opens the site */
  open: (site: string) => string;
  add: string;
  remove: string;
  /** Placeholders of the input's boxes */
  linkPlaceholder: string;
  bitcoinPlaceholder: string;
  notePlaceholder: string;
  labelPlaceholder: string;
  iconPlaceholder: string;
  descriptionPlaceholder: string;
  /** Errors of an entry */
  notHttps: string;
  badAddress: string;
}

export const DEFAULT_LINKS_MESSAGES: LinksMessages = {
  type: 'Type',
  typeLink: 'Link',
  typeBitcoin: 'Bitcoin address',
  typeNote: 'Note',
  bitcoin: 'Bitcoin',
  bitcoinDescription: 'On-chain payment',
  open: (site) => `${site} ↗`,
  add: 'Add',
  remove: 'Remove',
  linkPlaceholder: 'https://…',
  bitcoinPlaceholder: 'bc1…',
  notePlaceholder: 'e.g. Bank transfer details on request',
  labelPlaceholder: 'Label (optional)',
  iconPlaceholder: 'Emoji',
  descriptionPlaceholder: 'Description (optional)',
  notHttps: 'Only https:// links',
  badAddress: 'Not a Bitcoin address',
};
