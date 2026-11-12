/**
 * @nostr-post/cdn — Single-file CDN bundle (everything)
 *
 * The split build (`dist/split/`) has the same as one module per part: `base.js`, `plugins.js`,
 * `wiki.js`, `calendar.js`, `article.js`, `list.js`, sharing their code, with field plugins
 * loaded on demand. Use either this file or the split files on a page, not both.
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

// ── All plugins (side-effect: defines custom elements + registers plugins) ──
import '@nostr-post/plugin-stars/web';
import '@nostr-post/plugin-geo/web';
import '@nostr-post/plugin-date/web';
import '@nostr-post/plugin-profile/web';
import '@nostr-post/plugin-embed/web';
import '@nostr-post/plugin-venue/web';
import '@nostr-post/plugin-media/web';
import '@nostr-post/plugin-reference/web';
import '@nostr-post/plugin-markdown/web';
import '@nostr-post/plugin-hashtag/web';

// ── The parts, each listing its exports (the split build's entries) ─────────
// The bundle is their sum, so it re-exports them whole instead of listing every name twice
export * from './base';
export * from './plugins';
export * from './wiki';
export * from './calendar';
export * from './article';
export * from './list';
