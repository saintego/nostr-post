/**
 * User-facing text of <nostr-post-composer>'s submit area, with English defaults.
 * Apps override any of it through the composer's `messages` property (e.g. translations).
 */

export interface ComposerMessages {
  submit: string;
  submitting: string;
  loadingManifest: string;
  /** While plugins publish related events first (e.g. a venue's wiki page) */
  stepHooks: string;
  /** While the post itself is signed and published */
  stepPublish: string;
  /** Shown at the button when fields failed validation; the field labels follow */
  invalidFields: string;
  /** Publish hooks didn't finish in time */
  hooksTimeout: string;
  unknownError: string;
}

export const DEFAULT_COMPOSER_MESSAGES: ComposerMessages = {
  submit: 'Create Post',
  submitting: 'Creating...',
  loadingManifest: 'Loading Manifest...',
  stepHooks: 'Publishing linked pages…',
  stepPublish: 'Signing and publishing the post…',
  invalidFields: 'Please fix these fields:',
  hooksTimeout: 'Publishing linked pages took too long. Nothing was published; try again.',
  unknownError: 'Unknown error occurred',
};
