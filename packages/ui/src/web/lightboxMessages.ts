/**
 * User-facing text of <np-lightbox>, with English defaults. Apps override any of it with
 * its `messages` property (e.g. translations).
 */
export interface LightboxMessages {
  /** The dialog's name for screen readers */
  label: string;
  previous: string;
  next: string;
  /** "3 / 12" */
  position: (current: number, count: number) => string;
  fullScreen: string;
  close: string;
}

export const DEFAULT_LIGHTBOX_MESSAGES: LightboxMessages = {
  label: 'Photos and videos',
  previous: 'Previous',
  next: 'Next',
  position: (current, count) => `${current} / ${count}`,
  fullScreen: 'Full screen',
  close: 'Close',
};
