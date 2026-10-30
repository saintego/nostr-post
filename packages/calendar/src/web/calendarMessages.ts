import type { ListMessages } from '@nostr-post/list/web';

/**
 * Calendar wording of <np-calendar-save> over the list messages it is built on. Apps can
 * override any of it with the component's `messages` property (e.g. for translations).
 */
export const DEFAULT_CALENDAR_SAVE_MESSAGES: Partial<ListMessages> = {
  save: 'Add to calendar',
  saved: 'In calendar',
  untitled: 'Untitled calendar',
  loading: 'Loading your calendars…',
  noSigner: 'Sign in with a Nostr signer to use calendars.',
  itemCount: (count) => (count === 1 ? '1 event' : `${count} events`),
  newListPlaceholder: 'New calendar',
  noLists: 'No calendars yet',
};
