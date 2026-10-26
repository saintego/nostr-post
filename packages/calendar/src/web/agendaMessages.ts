/**
 * User-facing text of <nostr-calendar-agenda>. Apps can override any of it with the element's
 * `messages` property (e.g. for translations).
 */
export interface AgendaMessages {
  loading: string;
  /** No events in the date window */
  empty: string;
  /** Buttons that move the date window */
  previous: string;
  next: string;
  today: string;
  /** Accessible name of the buttons */
  navigation: string;
  /** Month view: a day's events not listed in its cell */
  moreEvents: (count: number) => string;
}

export const DEFAULT_AGENDA_MESSAGES: AgendaMessages = {
  loading: 'Loading...',
  empty: 'No events in this period',
  previous: 'Previous',
  next: 'Next',
  today: 'Today',
  navigation: 'Agenda period',
  moreEvents: (count) => `+${count} more`,
};
