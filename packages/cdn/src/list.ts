/**
 * @nostr-post/cdn - list: NIP-51 bookmark lists (<np-list-save>, <np-list-view>).
 */

import '@nostr-post/list/web';

// Bookmark lists (NIP-51): <np-list-save> and <np-list-view>, and the functions behind them
export {
  addToList,
  BOOKMARK_LISTS,
  CALENDAR_LISTS,
  createList,
  deleteList,
  fetchLists,
  fetchMyLists,
  hasItem,
  itemFor,
  itemsToSave,
  type ListKind,
  listField,
  removeFromList,
  // The list field (uiPlugin "list"): what it saves after publishing
  saveToChoices,
} from '@nostr-post/list';
