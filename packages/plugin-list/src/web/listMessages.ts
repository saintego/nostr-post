import type { ListTitleNames } from '../listTitles';
import type { MyListsMessages } from '../myLists';

/**
 * User-facing text of <np-list-save>, <np-list-view> and <np-list-input>. Apps can
 * override any of it with the components' `messages` property (e.g. for translations).
 * It includes the words of the framework-free helpers (listTitles, loadMyLists).
 */
export interface ListMessages extends ListTitleNames, MyListsMessages {
  /** Save button, when the item is in none of the user's lists */
  save: string;
  /** Save button, when it's in at least one */
  saved: string;
  /** Name of the user's bookmarks list (kind 10003), which has no title */
  bookmarks: string;
  /** A set without a title */
  untitled: string;
  /** While the user's lists load from relays */
  loading: string;
  /** While the signer hasn't given the user's pubkey yet (e.g. a remote signer, a prompt) */
  waitingForSigner: string;
  /** The signer didn't give the pubkey in time */
  signerNoAnswer: string;
  retry: string;
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
  /** Under the list field's lists: when they're saved to */
  fieldHint: string;
  /** A list next to another one with the same title: its type (`Liked (beer)`) */
  titleWithType: (title: string, type: string) => string;
  /** A new list the list field will create when the post is published */
  newListChoice: (title: string) => string;
  /** The list field's add button for a new list */
  addNewList: string;
  /** Loading, saving, creating or deleting failed */
  failed: (reason: string) => string;
}

export const DEFAULT_LIST_MESSAGES: ListMessages = {
  save: 'Save',
  saved: 'Saved',
  bookmarks: 'Bookmarks',
  untitled: 'Untitled list',
  loading: 'Loading your lists…',
  waitingForSigner: 'Waiting for your signer…',
  signerNoAnswer: "Your signer didn't answer. Check it for a pending request, then try again.",
  retry: 'Try again',
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
  fieldHint: 'Saved to the lists you tick when you publish. Lists for its type come first.',
  titleWithType: (title, type) => `${title} (${type})`,
  newListChoice: (title) => `${title} (new)`,
  addNewList: 'Add',
  failed: (reason) => `Failed: ${reason}`,
};
