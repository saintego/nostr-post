/**
 * @nostr-post/plugin-hashtag - Core entrypoint
 *
 * Import this for headless usage (validation, serialization).
 * Import '@nostr-post/plugin-hashtag/web' for Lit web components.
 */
export {
  hashtagPlugin,
  normalizeTag,
  extractHashtags,
  type HashtagPluginConfig,
} from './core';
