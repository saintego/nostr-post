import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { fetchEvents } from '@nostr-post/signer';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DEFAULT_WIKI_RELAYS, WIKI_KIND, wikiEventToManifestData } from '../nip54';
import type { WikiEvent, WikiResolverFunction } from '../resolver';
import { defaultResolver } from '../resolver';

@customElement('nostr-wiki-view')
export class NostrWikiView extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    * { box-sizing: border-box; }

    .wiki-view {
      border: 1px solid var(--nl-border, #e5e7eb);
      border-radius: 8px;
      background: var(--nl-bg, white);
      overflow: hidden;
    }

    /* ── Header ── */
    .wiki-header {
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid var(--nl-border, #e5e7eb);
      background: var(--nl-card-bg, #f9fafb);
      display: flex;
      align-items: baseline;
      gap: 0.625rem;
      flex-wrap: wrap;
    }
    .wiki-header h2 {
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0;
      color: var(--nl-text, #111827);
      flex: 1;
    }
    .wiki-badge {
      font-size: 0.7rem;
      color: var(--nl-text-secondary, #9ca3af);
      white-space: nowrap;
    }

    /* ── Infobox table ── */
    dl.wiki-infobox {
      display: grid;
      grid-template-columns: minmax(80px, auto) 1fr;
      margin: 0;
      padding: 0;
      border-bottom: 1px solid var(--nl-border, #e5e7eb);
    }
    .wiki-field { display: contents; }

    .wiki-field dt,
    .wiki-field dd {
      padding: 0.45rem 1rem;
      border-bottom: 1px solid var(--nl-border, #f3f4f6);
      margin: 0;
    }
    .wiki-field:last-child dt,
    .wiki-field:last-child dd { border-bottom: none; }

    .wiki-field dt {
      font-size: 0.69rem;
      font-weight: 600;
      color: var(--nl-text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--nl-card-bg, #f9fafb);
      display: flex;
      align-items: center;
    }
    .wiki-field dd {
      color: var(--nl-text, #111827);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
    }

    /* ── Prose ── */
    .wiki-prose {
      padding: 0.875rem 1.25rem;
      color: var(--nl-text, #374151);
      line-height: 1.7;
      font-size: 0.875rem;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ── Contributors ── */
    details.wiki-contributors { border-top: 1px solid var(--nl-border, #e5e7eb); }
    details.wiki-contributors summary {
      padding: 0.5rem 1.25rem;
      cursor: pointer;
      font-size: 0.75rem;
      color: var(--nl-primary, #6366f1);
      font-weight: 500;
      user-select: none;
    }
    .wiki-contributor {
      display: flex;
      justify-content: space-between;
      padding: 0.2rem 1.25rem;
      font-size: 0.72rem;
      color: var(--nl-text-secondary, #6b7280);
      font-family: monospace;
    }

    /* ── State messages ── */
    p {
      padding: 1.5rem;
      text-align: center;
      color: var(--nl-text-secondary, #6b7280);
      margin: 0;
    }

    /* ── Dark mode ── */
    :host-context(.dark) .wiki-view   { background: #1f2937; border-color: #374151; }
    :host-context(.dark) .wiki-header,
    :host-context(.dark) .wiki-field dt { background: #111827; border-color: #374151; }
    :host-context(.dark) .wiki-header h2,
    :host-context(.dark) .wiki-field dd  { color: #f3f4f6; }
    :host-context(.dark) .wiki-field dt,
    :host-context(.dark) .wiki-badge     { color: #9ca3af; }
    :host-context(.dark) .wiki-field dd  { border-color: #374151; }
    :host-context(.dark) .wiki-prose     { color: #d1d5db; }
    :host-context(.dark) dl.wiki-infobox { border-color: #374151; }
  `;
  @property({ type: String, attribute: 'entity-id' })
  entityId?: string;

  @property({ type: String, attribute: 'entity-i-id' })
  entityIId?: string;

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ attribute: false })
  resolver: WikiResolverFunction = defaultResolver;

  @property({ type: Array })
  relays: string[] = DEFAULT_WIKI_RELAYS;

  @state() private _loading = false;
  @state() private _error?: string;
  @state() private _formData?: Record<string, unknown>;
  @state() private _winningEvent?: WikiEvent;
  @state() private _allEvents: WikiEvent[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    void this._fetch();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('entityId') || changed.has('entityIId') || changed.has('manifest')) {
      void this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    if (!this.manifest) return;
    if (!this.entityId && !this.entityIId) return;

    this._loading = true;
    this._error = undefined;

    try {
      let filter: Record<string, unknown>;
      if (this.entityId) {
        filter = { kinds: [WIKI_KIND], '#d': [this.entityId] };
      } else {
        filter = { kinds: [WIKI_KIND], '#i': [this.entityIId] };
      }

      const raw = await fetchEvents(filter as never, this.relays);
      this._allEvents = raw as unknown as WikiEvent[];

      if (this.entityIId && this._allEvents.length > 0) {
        const dTags = [
          ...new Set(
            this._allEvents.map((e) => e.tags.find((t) => t[0] === 'd')?.[1]).filter(Boolean)
          ),
        ] as string[];
        if (dTags.length > 0) {
          const byDTag = (await fetchEvents(
            { kinds: [WIKI_KIND], '#d': dTags } as never,
            this.relays
          )) as unknown as WikiEvent[];
          const ids = new Set(this._allEvents.map((e) => e.id));
          for (const e of byDTag) {
            if (!ids.has(e.id)) this._allEvents.push(e);
          }
        }
      }

      const winner = this.resolver(this._allEvents);
      this._winningEvent = winner ?? undefined;
      this._formData = winner ? wikiEventToManifestData(winner, this.manifest) : undefined;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  override render() {
    if (this._loading) return html`<slot name="loading"><p>Loading…</p></slot>`;
    if (this._error) return html`<slot name="error"><p>Error: ${this._error}</p></slot>`;
    if (!this._winningEvent || !this._formData || !this.manifest) {
      return html`<slot name="empty"><p>No entity found.</p></slot>`;
    }

    const { manifest, _formData: data, _allEvents } = this;

    const infoFields = manifest.fields
      .filter((f) => {
        const targets = Array.isArray(f.mapTo) ? f.mapTo : [f.mapTo];
        return targets.some((t) => {
          if (t.kind !== WIKI_KIND) return false;
          if (t.target === 'table') return true;
          if (t.target === 'tag') return t.tagName !== 'd' && t.tagName !== 'title';
          return false;
        });
      })
      .filter((f) => data[f.id] !== undefined);

    return html`
      <div class="wiki-view">
        <header class="wiki-header">
          <h2>${String(data['title'] ?? data['__dTag'] ?? '')}</h2>
          <span class="wiki-badge">${_allEvents.length} contributor(s)</span>
        </header>

        ${
          infoFields.length > 0
            ? html`
          <dl class="wiki-infobox">
            ${infoFields.map((f) => {
              const value = data[f.id];
              const label = (f.metadata?.label as string | undefined) ?? f.id;
              const plugin = pluginRegistry.get(f.uiPlugin);
              const rendered = plugin?.renderView
                ? plugin.renderView(value, f)
                : Array.isArray(value)
                  ? value.join(', ')
                  : String(value);
              return html`
                <div class="wiki-field">
                  <dt>${label}</dt>
                  <dd>${rendered}</dd>
                </div>
              `;
            })}
          </dl>
        `
            : nothing
        }

        ${this._renderProseField()}

        <details class="wiki-contributors">
          <summary>All versions (${_allEvents.length})</summary>
          ${_allEvents.map(
            (e) => html`
            <div class="wiki-contributor">
              <span>${e.pubkey.slice(0, 8)}…</span>
              <span>${new Date(e.created_at * 1000).toLocaleDateString()}</span>
            </div>
          `
          )}
        </details>
      </div>
    `;
  }

  private _renderProseField() {
    if (!this.manifest || !this._formData) return nothing;
    const contentField = this.manifest.fields.find((f) => {
      const targets = Array.isArray(f.mapTo) ? f.mapTo : [f.mapTo];
      return targets.some((t) => t.kind === WIKI_KIND && t.target === 'content');
    });
    if (!contentField) return nothing;
    const value = this._formData[contentField.id];
    if (!value) return nothing;
    const plugin = pluginRegistry.get(contentField.uiPlugin);
    if (plugin?.renderView) {
      return html`<div class="wiki-prose">${plugin.renderView(value, contentField)}</div>`;
    }
    return html`<div class="wiki-prose">${String(value)}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-wiki-view': NostrWikiView;
  }
}
