/**
 * User-facing text of <nostr-post-support> and <nostr-post-support-button>, with English
 * defaults. Apps override any of it with the `messages` property (e.g. translations).
 */
export interface SupportMessages {
  /** The panel's heading, with the person's name when known */
  heading: (name?: string) => string;
  /** The button that opens the panel */
  button: string;
  loading: string;
  /** The person has no support page */
  empty: string;
  /** The owner's buttons */
  edit: string;
  create: string;
  /** The editor dialog's title and its button */
  editorHeading: string;
  save: string;
  /** People of the extra recipients list */
  alsoSupport: string;
}

export const DEFAULT_SUPPORT_MESSAGES: SupportMessages = {
  heading: (name) => (name ? `Support ${name}` : 'Support'),
  button: '♥ Support',
  loading: 'Loading…',
  empty: 'No ways to support here yet.',
  edit: 'Edit',
  create: 'Set up your support page',
  editorHeading: 'Support page',
  save: 'Save',
  alsoSupport: 'Also support',
};
