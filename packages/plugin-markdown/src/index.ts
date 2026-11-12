/**
 * @nostr-post/plugin-markdown - Core entrypoint
 *
 * Import this for headless usage (validation, serialization, safe HTML of Markdown).
 * Import '@nostr-post/plugin-markdown/web' for Lit web components.
 */
export { markdownPlugin, type MarkdownPluginConfig } from './core';
export { renderMarkdown } from './render';
