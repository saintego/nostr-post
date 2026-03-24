import { pluginRegistry } from '@nostr-post/plugins/registry';

import { referencePlugin } from './core';
import './web/input';
import './web/view';

pluginRegistry.register({
  ...referencePlugin,
  inputTagName: 'np-reference-input',
  viewTagName: 'np-reference-view',
});

export { referencePlugin } from './core';
