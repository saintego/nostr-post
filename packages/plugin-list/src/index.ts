export {
  currentLists,
  deletionEvent,
  hasItem,
  entityItems,
  itemFor,
  itemForEvent,
  type ListPreset,
  listPresets,
  manifestListPresets,
  listAddress,
  listAtAddress,
  newBookmarksEvent,
  newSetDTag,
  newSetEvent,
  parseList,
  sameItem,
  withBookmarks,
  withItem,
  withPresets,
  withoutItem,
} from './core';
export { eventForItem, eventTitle, fetchItemTitles, itemFilters } from './itemTitles';
export {
  choiceValue,
  fieldPresets,
  type ListChoice,
  itemsToSave,
  listChoices,
  listField,
  listFieldPlugin,
  saveToChoices,
} from './listField';
export {
  addItemsToList,
  addToList,
  createList,
  deleteList,
  fetchLists,
  fetchMyLists,
  removeFromList,
} from './lists';
export {
  BOOKMARK_SET_KIND,
  BOOKMARKS_KIND,
  type BookmarkList,
  DELETION_KIND,
  type ListEvent,
  type ListItem,
  type ListRelayOptions,
  WIKI_KIND,
} from './types';

// Register the list field plugin (the /web entry adds its input)
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { listFieldPlugin } from './listField';

pluginRegistry.register(listFieldPlugin);
