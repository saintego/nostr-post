/**
 * @nostr-post/cdn — Single-file CDN bundle
 *
 * Importing this file:
 *   1. Registers every nostr-post web component (<nostr-post-composer>, <nostr-post-view>, <nostr-post-feed>)
 *   2. Registers every plugin's custom elements and adds them to the PluginRegistry
 *   3. Re-exports core utilities for programmatic use
 *
 * Usage (like nostr-login — no npm, no bundler):
 *   <script type="module" src="https://saintego.github.io/nostr-post/nostr-post.js"></script>
 *   <nostr-post-composer auto-publish></nostr-post-composer>
 */

// ── Core web components (side-effect: defines custom elements) ──────────────
import '@nostr-post/web';

// ── All plugins (side-effect: defines custom elements + registers plugins) ──
import '@nostr-post/plugin-stars/web';
import '@nostr-post/plugin-geo/web';
import '@nostr-post/plugin-venue/web';
import '@nostr-post/plugin-media/web';
import '@nostr-post/plugin-markdown/web';
import '@nostr-post/plugin-hashtag/web';

// ── Re-exports for programmatic / advanced usage ────────────────────────────

// Core manifest & coordination
export {
  validateManifest,
  getFieldsByKind,
  getUsedKinds,
  findFieldById,
  getRequiredFields,
} from '@nostr-post/core/manifest';
export { coordinateEvents, validateFormData } from '@nostr-post/core/coordinator';

// Plugin registry
export { pluginRegistry } from '@nostr-post/plugins/registry';

// Signing & relay utilities
export {
  signEvent,
  signAndPublish,
  publishToRelay,
  publishToRelays,
  getPublicKey,
  hasNostrSigner,
  fetchEvents,
  fetchEventsFromRelay,
} from '@nostr-post/signer';

// Relay helpers (defined in web/signer, re-exported from web)
export {
  getUserRelays,
  getDefaultRelays,
} from '@nostr-post/web';
