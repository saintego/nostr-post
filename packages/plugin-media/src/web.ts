/**
 * @nostr-post/plugin-media/web
 *
 * Importing this module:
 * 1. Defines <np-media-input> and <np-media-view> custom elements
 * 2. Registers the media plugin (with tag names + textarea event handlers) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-media/web';
 *   // Now media plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { mediaPlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

// Import the media paste/drop handlers
import { handleMediaDrop, handleMediaPaste } from './web/upload';

// Register the plugin with its web component tag names + textarea event handlers
pluginRegistry.register({
  ...mediaPlugin,
  inputTagName: 'np-media-input',
  viewTagName: 'np-media-view',
  handleTextareaPaste: handleMediaPaste,
  handleTextareaDrop: handleMediaDrop,
  getFieldActions: (field) => [
    {
      id: 'media-upload',
      icon: '🖼️',
      label: 'Add media',
      onClick: ({ onUpdateField }) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept =
          (field.metadata?.accept as string[] | undefined)?.join(',') ?? 'image/*,video/*';
        input.multiple = true;
        input.onchange = async () => {
          const files = Array.from(input.files ?? []);
          if (!files.length) return;
          const fakeClipboard = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
          });
          // Use the same upload path as paste handler
          for (const file of files) {
            fakeClipboard.clipboardData?.items.add(file);
          }
          await handleMediaPaste(fakeClipboard, field, {
            formData: {},
            onUpdateField,
          });
        };
        input.click();
      },
    },
  ],
});

// Re-export components for direct usage
export { NpMediaInput } from './web/input';
export { NpMediaView } from './web/view';
export { mediaPlugin } from './core';

// Re-export upload utilities so consumers (e.g. the composer's paste/drop handler)
// can reuse the shared NIP-98 auth + upload logic without duplicating it.
export {
  uploadToNostrBuild,
  createNip98AuthToken,
  NOSTR_BUILD_UPLOAD,
  handleMediaPaste,
  handleMediaDrop,
} from './web/upload';
