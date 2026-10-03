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
import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { fetchEvents } from '@nostr-post/signer';
import {
  DEFAULT_WIKI_RELAYS,
  WIKI_KIND,
  defaultResolver,
  extractExternalIds,
  groupByDTag,
  normalizeDTag,
} from '@nostr-post/wiki';
import type { WikiEvent } from '@nostr-post/wiki';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import '@nostr-post/wiki/web';
import {
  type WikiEntityData,
  type WikiEntityPickerConfig,
  entityPrefill,
  getEntityManifest,
  matchesEntityQuery,
  wikiEntityPickerPlugin,
} from './core';

/** Events from the create dialog's composer that must not reach the form around the picker */
const DIALOG_EVENTS = [
  'np-value-changed',
  'nostr-wiki-field-change',
  'nostr-wiki-submit',
  'nostr-wiki-published',
  'nostr-wiki-error',
  'wiki-entity-create',
];

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

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(17, 24, 39, 0.5);
    }
    .modal {
      width: min(640px, 100%);
      max-height: calc(100vh - 2rem);
      overflow: auto;
      border-radius: 10px;
      background: var(--nl-bg, white);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--nl-border, #e5e7eb);
      font-weight: 600;
    }
    .modal-body {
      padding: 1rem;
    }

    :host-context(.dark) .modal {
      background: #1f2937;
      color: #f9fafb;
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
  /** Entity being created in the dialog */
  @state() private _creating?: { manifest: NostrPostManifest; prefill: Record<string, unknown> };
  private _debounceTimer?: ReturnType<typeof setTimeout>;

  private _searchId = 0;

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
      this._searchId++;
      this._searching = false;
      this._results = [];
      return;
    }

    // Show "Searching…" during the debounce so "No entities found" doesn't
    // flash before the query has even been sent.
    this._searching = true;
    this._debounceTimer = setTimeout(() => {
      void this._search();
    }, 300);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._debounceTimer);
    this._searchId++;
  }

  private async _search(): Promise<void> {
    const searchId = ++this._searchId;
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

      if (searchId !== this._searchId) return;

      // Relays without NIP-50 support often ignore `search` and return arbitrary
      // wiki events, so keep only events whose title or d-tag match the query.
      const matching = merged.filter((ev) => matchesEntityQuery(ev.tags, this._query));

      // Multiple pubkeys can publish the same d-tag slug. Group by d-tag and
      // resolve each group to a single winner so each article appears once.
      this._results = [...groupByDTag(matching).values()]
        .map((group) => defaultResolver(group))
        .filter((ev): ev is WikiEvent => ev !== null);
    } catch {
      if (searchId !== this._searchId) return;
      this._results = [];
    } finally {
      if (searchId === this._searchId) this._searching = false;
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

  /**
   * Dispatches a cancelable `wiki-entity-create`; unless a host handles it
   * (preventDefault), opens a composer for the entity manifest, if known.
   */
  private _onCreateRequest(): void {
    const proceed = this.dispatchEvent(
      new CustomEvent('wiki-entity-create', {
        detail: { query: this._query, entityManifest: this._config.entityManifest },
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
    if (!proceed) return;
    const manifest = getEntityManifest(this._config.entityManifest);
    if (manifest) this._creating = { manifest, prefill: entityPrefill(manifest, this._query) };
  }

  /** Select the entity the dialog just published */
  private _onEntityPublished(e: CustomEvent): void {
    const signed = e.detail?.results?.signedEvent as WikiEvent | undefined;
    const dTag = (e.detail?.dTag as string | undefined) ?? '';
    this._creating = undefined;
    if (signed && dTag) this._onSelect(signed);
  }

  private _isolated = new WeakSet<Element>();

  /** Keep the dialog composer's events from reaching the form around the picker */
  private _isolateDialog = (el?: Element) => {
    if (!el || this._isolated.has(el)) return;
    this._isolated.add(el);
    for (const type of DIALOG_EVENTS) el.addEventListener(type, (e) => e.stopPropagation());
  };

  private _renderCreateDialog() {
    if (!this._creating) return nothing;
    const stop = (e: Event) => e.stopPropagation();
    return html`
      <div class="modal-backdrop" @click=${() => {
        this._creating = undefined;
      }}>
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Create entity"
          @click=${stop}
          ${ref(this._isolateDialog)}
        >
          <div class="modal-header">
            <span>Create ${this._creating.manifest.metadata?.name ?? 'entity'}</span>
            <button type="button" class="clear-btn" aria-label="Close" @click=${() => {
              this._creating = undefined;
            }}>×</button>
          </div>
          <div class="modal-body">
            <nostr-wiki-composer
              auto-publish
              .manifest=${this._creating.manifest}
              .prefill=${this._creating.prefill}
              .relays=${this._relays}
              @nostr-wiki-published=${(e: CustomEvent) => this._onEntityPublished(e)}
            ></nostr-wiki-composer>
          </div>
        </div>
      </div>
    `;
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
        ${this._renderCreateDialog()}
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
