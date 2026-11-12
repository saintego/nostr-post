/**
 * Markdown as HTML, safe for text from anyone (posts and articles are written by strangers):
 * raw HTML in the text is shown as text, links with script schemes (`javascript:`, `vbscript:`,
 * `file:`, non-image `data:`) aren't links, and links open in a new tab without the page as
 * opener or referrer. CommonMark with tables, strikethrough, bare URLs as links and line
 * breaks kept (as Nostr text is written). No DOM dependencies.
 */

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  token?.attrSet('target', '_blank');
  token?.attrSet('rel', 'noopener noreferrer nofollow');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

const defaultImage =
  md.renderer.rules.image ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  token?.attrSet('loading', 'lazy');
  token?.attrSet('referrerpolicy', 'no-referrer');
  return defaultImage(tokens, idx, options, env, self);
};

/** The text's Markdown as safe HTML (see the module's comment); empty for no text */
export const renderMarkdown = (text: string): string => (text ? md.render(text) : '');
