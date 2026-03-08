export { listPlugin, fetchUserLists, parseListEvent, createListEvent } from './core';
export type {
  UserList,
  ListSelectionData,
  ListPluginConfig,
  Nip51ListEvent,
  Nip51ParsedList,
} from './types';

// Register the plugin
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { listPlugin } from './core';

pluginRegistry.register(listPlugin);
