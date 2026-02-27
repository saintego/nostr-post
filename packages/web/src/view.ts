/**
 * @nostr-post/web - <nostr-post-view> Web Component
 *
 * A universal viewer for displaying Nostr events
 */

import type { NostrPostManifest, PostField, UnsignedNostrEvent } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { NostrPostElement, baseStyles } from './base-component';
import type { SignedEvent } from './signer';

/** Event type that can be either unsigned or signed */
export type DisplayableEvent = UnsignedNostrEvent | SignedEvent;

/**
 * View Web Component for displaying Nostr events
 *
 * @example
 * ```html
 * <nostr-post-view></nostr-post-view>
 * <script>
 *   const view = document.querySelector('nostr-post-view');
 *   view.event = myNostrEvent;
 * </script>
 * ```
 */
@customElement('nostr-post-view')
export class NostrPostView extends NostrPostElement {
  static styles = [
    baseStyles,
    css`
      .view {
        padding: 1rem;
        border: 1px solid var(--nl-border, #e5e7eb);
        border-radius: 8px;
        background: var(--nl-card-bg, #f9fafb);
      }

      :host-context(.dark) .view {
        background: #374151;
        border-color: #4b5563;
      }

      .view-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        font-size: 12px;
      }

      .view-pubkey {
        font-family: monospace;
        color: var(--nl-text-secondary, #6b7280);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .view-timestamp {
        color: var(--nl-text-secondary, #6b7280);
        margin-left: auto;
      }

      .view-content {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.6;
        color: var(--nl-text, #1f2937);
      }

      :host-context(.dark) .view-content {
        color: #f3f4f6;
      }

      .view-tags {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--nl-border, #e5e7eb);
      }

      :host-context(.dark) .view-tags {
        border-color: #4b5563;
      }

      .tag {
        display: inline-block;
        padding: 2px 8px;
        margin: 0.25rem 0.25rem 0.25rem 0;
        background: var(--nl-tag-bg, #e5e7eb);
        border-radius: 4px;
        font-size: 12px;
        color: var(--nl-text-secondary, #6b7280);
      }

      :host-context(.dark) .tag {
        background: #4b5563;
        color: #d1d5db;
      }

      .tag-name {
        font-weight: 600;
        margin-right: 0.25rem;
      }

      .view-kind {
        display: inline-block;
        padding: 2px 8px;
        background: var(--nl-primary, #6366f1);
        color: white;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }

      .view-id {
        margin-top: 0.5rem;
        font-size: 11px;
        font-family: monospace;
        color: var(--nl-text-secondary, #9ca3af);
        word-break: break-all;
      }
    `,
  ];

  @property({ type: Object })
  event?: DisplayableEvent;

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ type: Boolean })
  showTags?: boolean;

  @property({ type: Boolean })
  showKind?: boolean;

  constructor() {
    super();
    this.showTags = true;
    this.showKind = true;
  }

  /**
   * Format timestamp to readable date
   */
  private formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Truncate pubkey for display
   */
  private truncatePubkey(pubkey: string): string {
    if (!pubkey) return 'Unknown';
    if (pubkey.length <= 16) return pubkey;
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  }

  render() {
    if (!this.event) {
      return html`<div class="error">
        No event provided. Please set the event property.
      </div>`;
    }

    const event = this.event;
    const kind = event.kind;
    const created_at = event.created_at;
    const tags = event.tags;
    const content = event.content;
    const pubkey = event.pubkey;
    const eventId = 'id' in event ? (event as SignedEvent).id : undefined;

    return html`
      <div class="view">
        <div class="view-header">
          ${this.showKind ? html`<span class="view-kind">Kind ${kind}</span>` : ''}
          <span class="view-pubkey" title=${pubkey}
            >${this.truncatePubkey(pubkey)}</span
          >
          <span class="view-timestamp"
            >${this.formatTimestamp(created_at)}</span
          >
        </div>

        <div class="view-content">
          ${content ? html`<div>${unsafeHTML(this.formatMarkdown(content))}</div>` : ''}
          ${this.renderTagPlugins(tags)}
        </div>

        ${
          this.showTags && tags.length > 0
            ? html`
              <div class="view-tags">
                ${tags.map(
                  (tag: string[]) => html`
                    <span class="tag">
                      <span class="tag-name">${tag[0]}:</span>
                      ${tag.slice(1).join(', ')}
                    </span>
                  `
                )}
              </div>
            `
            : ''
        }
        ${eventId ? html`<div class="view-id">ID: ${eventId}</div>` : ''}
      </div>
    `;
  }

  /**
   * Build a map from tag name -> manifest field for plugin lookup.
   */
  private getTagFieldMap(): Map<string, PostField> {
    const map = new Map<string, PostField>();
    if (this.manifest) {
      for (const field of this.manifest.fields) {
        if (field.mapTo.target === 'tag' && field.mapTo.tagName) {
          map.set(field.mapTo.tagName, field);
        }
      }
    }
    return map;
  }

  /**
   * Render tag values using registered plugin view components.
   * Falls back gracefully when no plugin or no viewTagName is registered.
   */
  private renderTagPlugins(tags: string[][]) {
    const tagFieldMap = this.getTagFieldMap();
    if (tagFieldMap.size === 0) return '';

    const results = [];
    for (const tag of tags) {
      const [tagName, rawValue] = tag;
      if (!rawValue) continue;

      const field = tagFieldMap.get(tagName);
      if (!field) continue;

      const plugin = pluginRegistry.get(field.uiPlugin);
      if (!plugin?.viewTagName) continue;

      // Deserialize the raw tag string to a typed value
      let value: unknown = rawValue;
      if (plugin.deserializeValue) {
        value = plugin.deserializeValue(rawValue, field);
      } else if (field.type === 'number') {
        value = Number(rawValue);
      }

      const viewTag = unsafeStatic(plugin.viewTagName);
      results.push(staticHtml`<${viewTag} .value=${value} .field=${field}></${viewTag}>`);
    }
    return results;
  }

  private formatMarkdown(text: string): string {
    if (!text) return '';
    let html = text;
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code
    html = html.replace(
      /`([^`]+)`/g,
      '<code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>'
    );
    // Headings
    html = html.replace(
      /^### (.*?)$/gm,
      '<h4 style="margin: 1rem 0 0.5rem 0; font-size: 1rem;">$1</h4>'
    );
    html = html.replace(
      /^## (.*?)$/gm,
      '<h3 style="margin: 1rem 0 0.5rem 0; font-size: 1.1rem;">$1</h3>'
    );
    html = html.replace(
      /^# (.*?)$/gm,
      '<h2 style="margin: 1rem 0 0.5rem 0; font-size: 1.25rem;">$1</h2>'
    );
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-view': NostrPostView;
  }
}
