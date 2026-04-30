/**
 * @nostr-post/plugin-wiki-entity - Web Component
 *
 * <wiki-entity-picker> — search-as-you-type selector for NIP-54 wiki entities.
 *
 * Flow:
 *   1. User types a query into the search box
 *   2. After minSearchLength chars, queries relays for matching 30818 events
 *   3. Results are displayed; user picks one
 *   4. On selection: runs resolver → creates WikiEntityData → dispatches 'np-value-changed'
 */

import { nip50Search } from '@nostr-post/core/nip50';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { fetchEvents } from '@nostr-post/signer';
import {
  DEFAULT_WIKI_RELAYS,
  WIKI_KIND,
  extractExternalIds,
  normalizeDTag,
} from '@nostr-post/wiki';
import { defaultResolver } from '@nostr-post/wiki';
import type { WikiEvent } from '@nostr-post/wiki';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type WikiEntityData, type WikiEntityPickerConfig, wikiEntityPickerPlugin } from './core';

@customElement('wiki-entity-picker')
export class WikiEntityPicker extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: inherit;
    }

    /* ── Selected chip ── */
    .selected {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.75rem;
      background: color-mix(in srgb, var(--nl-primary, #6366f1) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--nl-primary, #6366f1) 30%, transparent);
      border-radius: 0.375rem;
    }
    .selected-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--nl-text, #111827);
      flex: 1;
    }
    .selected-pubkey {
      font-size: 0.7rem;
      color: var(--nl-text-secondary, #6b7280);
      font-family: monospace;
    }
    .clear-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--nl-text-secondary, #6b7280);
      font-size: 1.1rem;
      padding: 0 0.15rem;
      line-height: 1;
      border-radius: 0.25rem;
    }
    .clear-btn:hover { color: #ef4444; }

    /* ── Picker wrapper ── */
    .picker { position: relative; }

    .search-input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.45rem 0.75rem;
      border: 1px solid var(--nl-border, #e5e7eb);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: var(--nl-text, #111827);
      background: var(--nl-bg, white);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .search-input:focus {
      border-color: var(--nl-primary, #6366f1);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--nl-primary, #6366f1) 15%, transparent);
    }

    /* ── Dropdown ── */
    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--nl-bg, white);
      border: 1px solid var(--nl-border, #e5e7eb);
      border-radius: 0.5rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      z-index: 100;
      overflow: hidden;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      cursor: pointer;
      border-bottom: 1px solid var(--nl-border, #e5e7eb);
      transition: background 0.1s;
      outline: none;
    }
    .result-item:last-of-type { border-bottom: none; }
    .result-item:hover,
    .result-item:focus {
      background: color-mix(in srgb, var(--nl-primary, #6366f1) 8%, transparent);
    }
    .result-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--nl-text, #111827);
      flex: 1;
    }
    .result-pubkey {
      font-size: 0.7rem;
      color: var(--nl-text-secondary, #6b7280);
      font-family: monospace;
    }
    .result-arrow {
      font-size: 0.75rem;
      color: var(--nl-text-secondary, #6b7280);
    }

    .status-row {
      padding: 0.625rem 0.875rem;
      font-size: 0.8rem;
      color: var(--nl-text-secondary, #6b7280);
    }

    .create-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.625rem 0.875rem;
      background: none;
      border: none;
      border-top: 1px solid var(--nl-border, #e5e7eb);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--nl-primary, #6366f1);
      text-align: left;
      transition: background 0.1s;
    }
    .create-btn:hover {
      background: color-mix(in srgb, var(--nl-primary, #6366f1) 8%, transparent);
    }

    :host-context(.dark) .search-input,
    :host-context(.dark) .dropdown {
      background: #1f2937;
      border-color: #374151;
      color: #f9fafb;
    }
    :host-context(.dark) .result-item:hover,
    :host-context(.dark) .result-item:focus {
      background: rgba(99, 102, 241, 0.15);
    }
    :host-context(.dark) .selected {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
    }
  `;
  @property({ attribute: false })
  value?: WikiEntityData;

  @property({ attribute: false })
  field?: { id: string; required?: boolean; metadata?: Record<string, unknown> };

  @state() private _query = '';
  @state() private _results: WikiEvent[] = [];
  @state() private _searching = false;
  @state() private _debounceTimer?: ReturnType<typeof setTimeout>;

  private get _config(): WikiEntityPickerConfig {
    return (this.field?.metadata as WikiEntityPickerConfig | undefined) ?? {};
  }

  private get _minLen(): number {
    return this._config.minSearchLength ?? 2;
  }

  private get _relays(): string[] {
    return this._config.relays ?? DEFAULT_WIKI_RELAYS;
  }

  private _onInput(e: InputEvent): void {
    this._query = (e.target as HTMLInputElement).value;
    clearTimeout(this._debounceTimer);

    if (this._query.length < this._minLen) {
      this._results = [];
      return;
    }

    this._debounceTimer = setTimeout(() => {
      void this._search();
    }, 300);
  }

  private async _search(): Promise<void> {
    this._searching = true;
    try {
      const slug = normalizeDTag(this._query);
      const merged = await nip50Search<WikiEvent>({
        fetchFn: fetchEvents as never,
        query: this._query,
        baseFilter: { kinds: [WIKI_KIND] },
        fallbackFilter: { '#d': [slug] },
        nip50Limit: 30,
        fallbackLimit: 20,
        relays: this._relays,
        getId: (ev) => ev.id,
      });

      // Multiple pubkeys can publish the same d-tag slug. Group by d-tag and
      // resolve each group to a single winner so each article appears once.
      const byDTag = new Map<string, WikiEvent[]>();
      for (const ev of merged) {
        const d = ev.tags.find((t) => t[0] === 'd')?.[1] ?? '';
        if (!byDTag.has(d)) byDTag.set(d, []);
        byDTag.get(d)!.push(ev);
      }
      this._results = [...byDTag.values()]
        .map((group) => defaultResolver(group))
        .filter((ev): ev is WikiEvent => ev !== null);
    } catch {
      this._results = [];
    } finally {
      this._searching = false;
    }
  }

  private _onSelect(event: WikiEvent): void {
    const winner = defaultResolver([event]);
    if (!winner) return;

    const dTag = winner.tags.find((t) => t[0] === 'd')?.[1] ?? '';
    const titleTag = winner.tags.find((t) => t[0] === 'title')?.[1];

    const entityData: WikiEntityData = {
      dTag,
      resolvedPubkey: winner.pubkey,
      externalIds: extractExternalIds(winner),
      displayName: titleTag ?? dTag,
    };

    this.value = entityData;
    this._results = [];
    this._query = '';

    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: entityData },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _clear(): void {
    this.value = undefined;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: undefined },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onCreateRequest(): void {
    this.dispatchEvent(
      new CustomEvent('wiki-entity-create', {
        detail: { query: this._query },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    if (this.value) {
      return html`
        <div class="selected">
          <span class="selected-name">${this.value.displayName ?? this.value.dTag}</span>
          <span class="selected-pubkey">${this.value.resolvedPubkey.slice(0, 8)}…</span>
          <button type="button" class="clear-btn" @click=${this._clear} aria-label="Clear selection">×</button>
        </div>
      `;
    }

    const showDropdown =
      this._searching ||
      this._results.length > 0 ||
      (this._query.length >= this._minLen && !this._searching);

    return html`
      <div class="picker">
        <input
          class="search-input"
          type="search"
          placeholder="Search entities…"
          .value=${this._query}
          @input=${this._onInput}
          aria-label="Search for an entity"
          autocomplete="off"
        />
        ${
          showDropdown
            ? html`
              <div class="dropdown" role="listbox">
                ${this._searching ? html`<div class="status-row">Searching…</div>` : nothing}
                ${this._results.map((event) => {
                  const dTag = event.tags.find((t) => t[0] === 'd')?.[1] ?? '';
                  const title = event.tags.find((t) => t[0] === 'title')?.[1] ?? dTag;
                  return html`
                    <div
                      role="option"
                      class="result-item"
                      @click=${() => this._onSelect(event)}
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === ' ') {
                          e.preventDefault();
                          this._onSelect(event);
                        } else if (e.key === 'Enter') {
                          this._onSelect(event);
                        }
                      }}
                      tabindex="0"
                    >
                      <span class="result-title">${title}</span>
                      <span class="result-pubkey">${event.pubkey.slice(0, 8)}…</span>
                      <span class="result-arrow">↵</span>
                    </div>
                  `;
                })}
                ${
                  !this._searching &&
                  this._results.length === 0 &&
                  this._query.length >= this._minLen
                    ? html`
                      <div class="status-row">No entities found for "${this._query}"</div>
                      <button class="create-btn" type="button" @click=${this._onCreateRequest}>
                        + Create "${this._query}"
                      </button>
                    `
                    : nothing
                }
              </div>
            `
            : nothing
        }
      </div>
    `;
  }
}

// Register plugin and set inputTagName so the composer knows which element to use
const entry = pluginRegistry.get('wiki-entity-picker');
if (entry) {
  entry.inputTagName = 'wiki-entity-picker';
} else {
  pluginRegistry.register({ ...wikiEntityPickerPlugin, inputTagName: 'wiki-entity-picker' });
}

declare global {
  interface HTMLElementTagNameMap {
    'wiki-entity-picker': WikiEntityPicker;
  }
}
