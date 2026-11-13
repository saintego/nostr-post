/**
 * Where a post in <nostr-post-view> comes from (NIP-48 `proxy` tag): "Imported from
 * facebook.com", linking the source, for events imported or bridged from elsewhere (a gig from
 * a venue's page, a note bridged from Mastodon).
 */

import { proxyOf, siteOf, sourceUrl } from '@nostr-post/core/proxy';
import { html, nothing } from 'lit';

/**
 * User-facing text of the source line. Apps can override it with <nostr-post-view>'s
 * `messages` property (e.g. translations).
 */
export interface SourceMessages {
  /** Before the source's site, e.g. "Imported from facebook.com" */
  importedFrom: (site: string) => string;
}

export const DEFAULT_SOURCE_MESSAGES: SourceMessages = {
  importedFrom: (site) => `Imported from ${site}`,
};

/** The source line of a post with a proxy tag; nothing without one */
export const renderSource = (tags: string[][], messages: SourceMessages) => {
  const source = proxyOf(tags);
  if (!source) return nothing;
  const url = sourceUrl(source);
  const site = url ? siteOf(url) : source.protocol;
  return html`<div class="view-source np-hint" part="source">
    ${
      url
        ? html`<a href=${url} target="_blank" rel="noopener noreferrer">${messages.importedFrom(site)}</a>`
        : messages.importedFrom(site)
    }
  </div>`;
};
