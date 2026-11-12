/**
 * @nostr-post/plugin-markdown - <np-markdown-view>
 *
 * Read-only rendered markdown display: the text as safe HTML (`renderMarkdown`: raw HTML
 * shown as text, no script links), so text from anyone can be shown.
 *
 * Accepts .value (markdown string) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderMarkdown } from '../render';

@customElement('np-markdown-view')
export class NpMarkdownView extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host {
      display: block;
    }

    .markdown-view {
      line-height: 1.7;
      color: var(--np-color-on-surface);
      font-size: var(--np-text-md);
    }

    .markdown-view h1 {
      font-size: var(--np-text-2xl);
      margin: 1rem 0 0.5rem;
      font-weight: 700;
    }

    .markdown-view h2 {
      font-size: var(--np-text-xl);
      margin: 1rem 0 0.5rem;
      font-weight: 600;
    }

    .markdown-view h3 {
      font-size: var(--np-text-xl);
      margin: 0.75rem 0 0.5rem;
      font-weight: 600;
    }

    .markdown-view strong {
      font-weight: 700;
    }

    .markdown-view em {
      font-style: italic;
    }

    .markdown-view s {
      text-decoration: line-through;
    }

    .markdown-view code {
      background: var(--np-color-surface-container);
      padding: 2px 5px;
      border-radius: var(--np-radius-xs);
      font-family: var(--np-font-family-mono);
      font-size: 0.875em;
    }

    .markdown-view pre {
      background: var(--np-color-inverse-surface);
      color: var(--np-color-on-surface-variant);
      padding: 0.75rem 1rem;
      border-radius: var(--np-radius-sm);
      overflow-x: auto;
      font-family: var(--np-font-family-mono);
      font-size: var(--np-text-md);
      line-height: 1.5;
    }

    .markdown-view pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .markdown-view blockquote {
      border-left: 3px solid var(--np-color-outline-variant);
      padding-left: 0.75rem;
      margin: 0.5rem 0;
      color: var(--np-color-on-surface-variant);
      font-style: italic;
    }

    .markdown-view a {
      color: var(--np-color-primary);
      text-decoration: underline;
    }

    .markdown-view a:hover {
      color: var(--np-color-primary);
    }

    .markdown-view img {
      max-width: 100%;
      border-radius: var(--np-radius-sm);
    }

    .markdown-view hr {
      border: none;
      border-top: 1px solid var(--np-color-outline-variant);
      margin: 1rem 0;
    }

    .markdown-view ul,
    .markdown-view ol {
      padding-left: 1.5rem;
      margin: 0.5rem 0;
    }

    .markdown-view li {
      margin: 0.25rem 0;
    }

    .empty {
      font-size: var(--np-text-md);
      color: var(--np-color-on-surface-variant);
      font-style: italic;
    }

  `,
  ];

  @property({ type: String })
  value = '';

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    if (!this.value) {
      return html`<span class="empty">No content</span>`;
    }

    return html`
      <div class="markdown-view">${unsafeHTML(renderMarkdown(this.value))}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-markdown-view': NpMarkdownView;
  }
}
