import { pluginRegistry } from '@nostr-post/plugins/registry';

import { identifierPlugin } from './core';

pluginRegistry.register(identifierPlugin);

export { identifierPlugin } from './core';
