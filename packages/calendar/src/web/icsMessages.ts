/**
 * User-facing text of <np-ics-download>. Apps can override any of it with the component's
 * `messages` property (e.g. for translations).
 */
export interface IcsMessages {
  download: string;
  /** Tooltip of the button */
  title: string;
  preparing: string;
  notFound: string;
  failed: (reason: string) => string;
}

export const DEFAULT_ICS_MESSAGES: IcsMessages = {
  download: '.ics',
  title: 'Add to your calendar app (.ics file)',
  preparing: '…',
  notFound: 'Event not found on the relays',
  failed: (reason) => `Couldn't make the file: ${reason}`,
};
