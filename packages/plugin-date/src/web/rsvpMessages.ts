/**
 * User-facing text of <np-rsvp>. Apps can override any of it with the component's
 * `messages` property (e.g. for translations).
 */
export interface RsvpMessages {
  accepted: string;
  tentative: string;
  declined: string;
  /** Accessible name of the buttons */
  label: string;
  /** While the answer is signed and published */
  saving: string;
  /** The answer wasn't published; the reason follows */
  failed: (reason: string) => string;
}

export const DEFAULT_RSVP_MESSAGES: RsvpMessages = {
  accepted: 'Going',
  tentative: 'Maybe',
  declined: "Can't go",
  label: 'Will you attend?',
  saving: 'Saving…',
  failed: (reason) => `Couldn't save your answer: ${reason}`,
};
