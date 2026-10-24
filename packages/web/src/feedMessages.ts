/**
 * User-facing text of <nostr-post-feed>, with English defaults. Apps override any of it
 * through the feed's `messages` property (e.g. translations).
 */
export interface FeedMessages {
  loading: string;
  empty: string;
  /** Agenda mode: no events in the date window */
  emptyAgenda: string;
  /** Agenda buttons that move the date window */
  previous: string;
  next: string;
  today: string;
  /** Accessible name of the agenda's buttons */
  agendaNavigation: string;
}

export const DEFAULT_FEED_MESSAGES: FeedMessages = {
  loading: 'Loading...',
  empty: 'No posts yet',
  emptyAgenda: 'No events in this period',
  previous: 'Previous',
  next: 'Next',
  today: 'Today',
  agendaNavigation: 'Agenda period',
};
