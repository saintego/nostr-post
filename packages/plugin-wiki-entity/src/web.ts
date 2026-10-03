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
} from '@nostr-post/wiki';
import type { WikiEvent } from '@nostr-post/wiki';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import '@nostr-post/wiki/web';
import {
  type EntityTypeAffixes,
  TEXT_ONLY_ENTITY_MANIFEST,
  type WikiEntityData,
  type WikiEntityPickerConfig,
  entityPrefill,
  entitySnippet,
  entityTypeAffixes,
  entityTypeDTag,
  getEntityManifest,
  matchesEntityQuery,
  matchesEntityType,
  wikiEntityPickerPlugin,
} from './core';
import { pickerStyles } from './webStyles';

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
  static override styles = pickerStyles;
  @property({ attribute: false })
  value?: WikiEntityData;

  @property({ attribute: false })
  field?: { id: string; required?: boolean; metadata?: Record<string, unknown> };

  @state() private _query = '';
  /** Resolved version of each matching entity and how many versions were found */
  @state() private _results: Array<{ event: WikiEvent; versions: number }> = [];
  /** d-tag of the entity shown in the preview overlay */
  @state() private _previewDTag?: string;
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

  /** d-tag prefix/suffix of the picked entity type; empty if the manifest isn't known */
  private get _affixes(): EntityTypeAffixes {
    const manifest = getEntityManifest(this._config.entityManifest);
    return manifest ? entityTypeAffixes(manifest) : { prefix: '', suffix: '' };
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
      const affixes = this._affixes;
      const slug = entityTypeDTag(this._query, affixes);
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
      // wiki events, so keep only events whose title or d-tag match the query,
      // and only entities of the picked type (e.g. d-tags ending in -beer).
      const matching = merged.filter(
        (ev) =>
          matchesEntityQuery(ev.tags, this._query) &&
          matchesEntityType(ev.tags.find((t) => t[0] === 'd')?.[1] ?? '', affixes)
      );

      // Multiple pubkeys can publish the same d-tag slug. Group by d-tag and
      // resolve each group to a single winner so each article appears once.
      this._results = [...groupByDTag(matching).values()].flatMap((group) => {
        const event = defaultResolver(group);
        return event ? [{ event, versions: group.length }] : [];
      });
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

  /** The d-tag "+ Create" will produce, when the type adds a prefix/suffix */
  private _createDTagHint() {
    const affixes = this._affixes;
    if (!affixes.prefix && !affixes.suffix) return nothing;
    return html`<span class="create-dtag">${entityTypeDTag(this._query, affixes)}</span>`;
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

  /** Overlay shared by the create dialog and the preview */
  private _renderModal(title: string, body: unknown, onClose: () => void) {
    return html`
      <div class="modal-backdrop" @click=${onClose}>
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-label=${title}
          @click=${(e: Event) => e.stopPropagation()}
          ${ref(this._isolateDialog)}
        >
          <div class="modal-header">
            <span>${title}</span>
            <button type="button" class="clear-btn" aria-label="Close" @click=${onClose}>×</button>
          </div>
          <div class="modal-body">${body}</div>
        </div>
      </div>
    `;
  }

  private _renderCreateDialog() {
    const creating = this._creating;
    if (!creating) return nothing;
    return this._renderModal(
      `Create ${creating.manifest.metadata?.name ?? 'entity'}`,
      html`
        <nostr-wiki-composer
          auto-publish
          .manifest=${creating.manifest}
          .prefill=${creating.prefill}
          .relays=${this._relays}
          @nostr-wiki-published=${(e: CustomEvent) => this._onEntityPublished(e)}
        ></nostr-wiki-composer>
      `,
      () => {
        this._creating = undefined;
      }
    );
  }

  /** Read-only view of an entity; articles of unknown type show their text */
  private _renderPreview() {
    const dTag = this._previewDTag;
    if (!dTag) return nothing;
    const manifest = getEntityManifest(this._config.entityManifest) ?? TEXT_ONLY_ENTITY_MANIFEST;
    return this._renderModal(
      dTag,
      html`
        <nostr-wiki-view
          .manifest=${manifest}
          .entityId=${dTag}
          .relays=${this._relays}
        ></nostr-wiki-view>
      `,
      () => {
        this._previewDTag = undefined;
      }
    );
  }

  /** Eye button that opens the preview without selecting the row */
  private _previewButton(dTag: string) {
    const open = (e: Event) => {
      e.stopPropagation();
      this._previewDTag = dTag;
    };
    return html`
      <button
        type="button"
        class="preview-btn"
        title="Preview"
        aria-label="Preview ${dTag}"
        @click=${open}
        @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
      >👁</button>
    `;
  }

  private _renderResult({ event, versions }: { event: WikiEvent; versions: number }) {
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1] ?? '';
    const title = event.tags.find((t) => t[0] === 'title')?.[1] ?? dTag;
    const snippet = entitySnippet(event.tags, event.content);
    const select = () => this._onSelect(event);
    return html`
      <div
        role="option"
        class="result-item"
        @click=${select}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            select();
          }
        }}
        tabindex="0"
      >
        <div class="result-main">
          <div class="result-line">
            <span class="result-title">${title}</span>
            <span class="result-meta">
              ${new Date(event.created_at * 1000).toLocaleDateString()} ·
              ${versions} version${versions === 1 ? '' : 's'}
            </span>
          </div>
          <div class="result-line">
            <span class="result-slug">${dTag}</span>
            ${snippet ? html`<span class="result-snippet">${snippet}</span>` : nothing}
          </div>
        </div>
        ${this._previewButton(dTag)}
      </div>
    `;
  }

  override render() {
    if (this.value) {
      return html`
        <div class="selected">
          <span class="selected-name">${this.value.displayName ?? this.value.dTag}</span>
          <span class="selected-slug">${this.value.dTag}</span>
          ${this._previewButton(this.value.dTag)}
          <button type="button" class="clear-btn" @click=${this._clear} aria-label="Clear selection">×</button>
        </div>
        ${this._renderPreview()}
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
                ${this._results.map((result) => this._renderResult(result))}
                ${
                  !this._searching &&
                  this._results.length === 0 &&
                  this._query.length >= this._minLen
                    ? html`
                      <div class="status-row">No entities found for "${this._query}"</div>
                      <button class="create-btn" type="button" @click=${this._onCreateRequest}>
                        + Create "${this._query}"
                        ${this._createDTagHint()}
                      </button>
                    `
                    : nothing
                }
              </div>
            `
            : nothing
        }
        ${this._renderCreateDialog()}
        ${this._renderPreview()}
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
