/**
 * @nostr-post/plugin-markdown - <np-markdown-view>
 *
 * Read-only rendered markdown display.
 * Converts markdown to HTML for display.
 *
 * Accepts .value (markdown string) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

function renderMarkdown(md: string): string {
  if (!md) return '';
  let h = md;
  // Code blocks
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Inline code
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold + Italic
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  h = h.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Links
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Images
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // Unordered lists
  h = h.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Blockquote
  h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Horizontal rule
  h = h.replace(/^---$/gm, '<hr>');
  // Line breaks
  h = h.replace(/\n/g, '<br>');
  // Clean up
  h = h.replace(/<\/li><br>/g, '</li>');
  h = h.replace(/<\/ul><br>/g, '</ul>');
  h = h.replace(/<\/blockquote><br>/g, '</blockquote>');
  h = h.replace(/<\/pre><br>/g, '</pre>');
  h = h.replace(/<\/h([1-3])><br>/g, '</h$1>');
  return h;
}

@customElement('np-markdown-view')
export class NpMarkdownView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .markdown-view {
      line-height: 1.7;
      color: #1f2937;
      font-size: 0.9375rem;
    }

    .markdown-view h1 {
      font-size: 1.5rem;
      margin: 1rem 0 0.5rem;
      font-weight: 700;
    }

    .markdown-view h2 {
      font-size: 1.25rem;
      margin: 1rem 0 0.5rem;
      font-weight: 600;
    }

    .markdown-view h3 {
      font-size: 1.125rem;
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
      background: #f3f4f6;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 0.875em;
    }

    .markdown-view pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .markdown-view pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .markdown-view blockquote {
      border-left: 3px solid #d1d5db;
      padding-left: 0.75rem;
      margin: 0.5rem 0;
      color: #6b7280;
      font-style: italic;
    }

    .markdown-view a {
      color: #6366f1;
      text-decoration: underline;
    }

    .markdown-view a:hover {
      color: #4f46e5;
    }

    .markdown-view img {
      max-width: 100%;
      border-radius: 6px;
    }

    .markdown-view hr {
      border: none;
      border-top: 1px solid #e5e7eb;
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
      font-size: 0.875rem;
      color: #9ca3af;
      font-style: italic;
    }
  `;

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
