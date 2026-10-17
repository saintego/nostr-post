/**
 * User-facing text of <np-list-save> and <np-list-view>. Apps can override any of it
 * with the components' `messages` property (e.g. for translations).
 */
export interface ListMessages {
  /** Save button, when the item is in none of the user's lists */
  save: string;
  /** Save button, when it's in at least one */
  saved: string;
  /** Name of the user's bookmarks list (kind 10003), which has no title */
  bookmarks: string;
  /** A set without a title */
  untitled: string;
  loading: string;
  noSigner: string;
  /** Number of items in a list */
  itemCount: (count: number) => string;
  newListPlaceholder: string;
  createList: string;
  creating: string;
  close: string;
  /** A list without items */
  emptyList: string;
  /** The signed-in user has no sets and nothing bookmarked */
  noLists: string;
  remove: string;
  deleteList: string;
  confirmDelete: (title: string) => string;
  /** An item whose event wasn't found */
  unknownItem: (value: string) => string;
  /** Loading, saving, creating or deleting failed */
  failed: (reason: string) => string;
}

export const DEFAULT_LIST_MESSAGES: ListMessages = {
  save: 'Save',
  saved: 'Saved',
  bookmarks: 'Bookmarks',
  untitled: 'Untitled list',
  loading: 'Loading lists…',
  noSigner: 'Sign in with a Nostr signer to use lists.',
  itemCount: (count) => (count === 1 ? '1 item' : `${count} items`),
  newListPlaceholder: 'New list',
  createList: 'Create',
  creating: 'Creating…',
  close: 'Close',
  emptyList: 'Nothing saved yet',
  noLists: 'No lists yet',
  remove: 'Remove',
  deleteList: 'Delete list',
  confirmDelete: (title) => `Delete the list "${title}"?`,
  unknownItem: (value) => value,
  failed: (reason) => `Failed: ${reason}`,
};

/** What a list is called: its title; the bookmarks list has none */
export const listTitle = (
  list: { kind: number; title?: string },
  m: Pick<ListMessages, 'bookmarks' | 'untitled'>
): string => list.title ?? (list.kind === 10003 ? m.bookmarks : m.untitled);
