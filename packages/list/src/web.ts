/**
 * @nostr-post/list - web components
 *
 * <np-list-save> saves something to the user's lists; <np-list-view> shows lists;
 * <np-list-input> is the list field's input (`uiPlugin: "list"`). Importing this entry
 * registers the field plugin and adds Save to events made with manifests that have `lists`
 * (<nostr-post-view>, <nostr-wiki-view>, the venue view: `@nostr-post/plugins/entities`).
 */

import { registerEventAction, registerKindView } from '@nostr-post/plugins/entities';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { listFieldPlugin } from './listField';
import { manifestListPresets } from './core';
import { BOOKMARK_SET_KIND, BOOKMARKS_KIND } from './types';
import './web/listInput';
import './web/listSave';
import './web/listView';

pluginRegistry.register({ ...listFieldPlugin, inputTagName: 'np-list-input' });

// Save on events made with manifests that name lists (posts, wiki pages, venues)
registerEventAction({
  tagName: 'np-list-save',
  matches: (manifest) => manifestListPresets(manifest).length > 0,
});

// A post linking a list (`nostr:naddr…`) shows the list
registerKindView({ kinds: [BOOKMARKS_KIND, BOOKMARK_SET_KIND], tagName: 'np-list-view' });

export { NpListInput } from './web/listInput';
export { NpListSave } from './web/listSave';
export { NpListView } from './web/listView';
export { DEFAULT_LIST_MESSAGES, type ListMessages } from './web/listMessages';
