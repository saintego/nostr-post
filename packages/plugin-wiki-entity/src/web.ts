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

import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import './pagePublish';
import {
  DEFAULT_WIKI_RELAYS,
  defaultResolver,
  entityCreatorFor,
  resolveEntityManifest,
} from '@nostr-post/wiki';
import type { CreatedEntity, WikiEvent } from '@nostr-post/wiki';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import '@nostr-post/wiki/web';
import {
  type EntityTypeAffixes,
  type WikiEntityData,
  type WikiEntityPickerConfig,
  createTarget,
  entityDataOf,
  entityPrefill,
  entitySnippet,
  entityTypeAffixes,
  entityTypeDTag,
  getEntityManifest,
  pickedEntities,
  wikiEntityPickerPlugin,
} from './core';
import {
  DEFAULT_WIKI_ENTITY_PICKER_MESSAGES,
  type WikiEntityPickerMessages,
} from './pickerMessages';
import { needsPageLinks, withPageLinks } from './eventLinks';
import { renderModal } from './modal';
import { isShown, renderPickedChip } from './pickedChip';
import { type EntitySearchResult, searchEntities } from './search';
import { pickerStyles } from './webStyles';

@customElement('wiki-entity-picker')
export class WikiEntityPicker extends LitElement {
  static override styles = pickerStyles;
  /** One entity, or a list with `metadata.multiple` */
  @property({ attribute: false })
  value?: WikiEntityData | WikiEntityData[];

  @property({ attribute: false })
  field?: { id: string; required?: boolean; metadata?: Record<string, unknown> };

  /** Overrides for the picker's user-facing text (e.g. translations) */
  @property({ attribute: false })
  messages?: Partial<WikiEntityPickerMessages>;

  @state() private _query = '';
  /** Resolved version of each matching entity and how many versions were found */
  @state() private _results: EntitySearchResult[] = [];
  /** d-tag of the entity shown in the preview overlay */
  @state() private _previewDTag?: string;
  @state() private _searching = false;
  /** Entity being created in the dialog */
  @state() private _creating?: {
    manifest: NostrPostManifest;
    prefill: Record<string, unknown>;
    /** A plugin's create form for this type (e.g. venues from OpenStreetMap) */
    creatorTag?: string;
    /** The unlinked entity whose page this is: the created one takes its place */
    replaces?: WikiEntityData;
  };
  private _debounceTimer?: ReturnType<typeof setTimeout>;

  private _searchId = 0;

  private get _m(): WikiEntityPickerMessages {
    return { ...DEFAULT_WIKI_ENTITY_PICKER_MESSAGES, ...this.messages };
  }

  private get _config(): WikiEntityPickerConfig {
    return (this.field?.metadata as WikiEntityPickerConfig | undefined) ?? {};
  }

  private get _picked(): WikiEntityData[] {
    return pickedEntities(this.value);
  }

  private _emit(value: WikiEntityData | WikiEntityData[] | undefined): void {
    this.value = value;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
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

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('value')) void this._splitLinks();
  }

  /** An edited event's links back to their entities, so removing one removes its links */
  private async _splitLinks(): Promise<void> {
    const value = this.value;
    if (!Array.isArray(value) || !needsPageLinks(value)) return;
    const split = await withPageLinks(value, this._relays);
    if (this.value === value && split !== value) this._emit(split);
  }

  /** An entity manifest given by its published address: fetch it once, then re-render */
  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('field')) return;
    const ref = this._config.entityManifest;
    if (ref && !getEntityManifest(ref)) {
      void resolveEntityManifest(ref).then((manifest) => manifest && this.requestUpdate());
    }
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
      const results = await searchEntities(this._query, {
        entityManifest: getEntityManifest(this._config.entityManifest),
        relays: this._relays,
      });
      if (searchId !== this._searchId) return;
      this._results = results;
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

    const replaces = this._creating?.replaces;
    const picked = entityDataOf(winner);
    // A created page of an unlinked entity keeps the links the event had for it
    const entityData = replaces
      ? { ...picked, externalIds: [...new Set([...picked.externalIds, ...replaces.externalIds])] }
      : picked;

    this._results = [];
    this._query = '';
    if (!this._config.multiple) {
      this._emit(entityData);
      return;
    }
    const others = this._picked.filter(
      (e) => e !== replaces && (e.unlinked || e.dTag !== entityData.dTag)
    );
    this._emit([...others, entityData]);
  }

  /** Removes one picked entity (a list) or the selection */
  private _remove(entity: WikiEntityData): void {
    if (!this._config.multiple) {
      this._emit(undefined);
      return;
    }
    const rest = this._picked.filter((e) => e !== entity);
    this._emit(rest.length > 0 ? rest : undefined);
  }

  /** Opens the create dialog for an unlinked entity, with its name and links */
  private _createFor(entity: WikiEntityData): void {
    const manifest = getEntityManifest(this._config.entityManifest);
    if (!manifest) return;
    this._creating = {
      manifest,
      prefill: entity.prefill ?? entityPrefill(manifest, entity.displayName ?? ''),
      creatorTag: entityCreatorFor(manifest)?.tagName,
      replaces: entity,
    };
  }

  private _renderPicked(entity: WikiEntityData) {
    return renderPickedChip(entity, {
      messages: this._m,
      onRemove: () => this._remove(entity),
      onCreate: () => this._createFor(entity),
      preview: (dTag) => this._previewButton(dTag),
    });
  }

  /**
   * Dispatches a cancelable `wiki-entity-create`; unless a host handles it
   * (preventDefault), opens a composer for the entity manifest, if known. If the
   * name's d-tag is taken, the composer asks for a distinguishing slug.
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
    if (manifest) {
      this._creating = {
        manifest,
        prefill: entityPrefill(manifest, this._query),
        creatorTag: entityCreatorFor(manifest)?.tagName,
      };
    }
  }

  /** The d-tag "+ Create" will produce, when the type adds a prefix/suffix */
  private _createDTagHint() {
    const affixes = this._affixes;
    if (!affixes.prefix && !affixes.suffix) return nothing;
    return html`<span class="create-dtag">${entityTypeDTag(this._query, affixes)}</span>`;
  }

  /**
   * "+ Create" below the results, also when some entities matched (they may not
   * be the one the user wants). If the name's d-tag is taken, it offers to create
   * another entity with that name; the composer then asks for a distinct slug.
   */
  private _renderCreateOption() {
    const { dTag, exists } = createTarget(
      this._query,
      this._results.map((r) => r.event.tags.find((t) => t[0] === 'd')?.[1] ?? ''),
      this._affixes
    );
    const m = this._m;
    return html`
      ${
        this._results.length === 0
          ? html`<div class="status-row">${m.noResults(this._query)}</div>`
          : nothing
      }
      ${exists ? html`<div class="status-row">${m.alreadyExists(dTag)}</div>` : nothing}
      <button class="create-btn" type="button" @click=${this._onCreateRequest}>
        ${exists ? m.createAnother(this._query) : m.create(this._query)}
        ${exists ? html`<span class="create-dtag">${m.distinctSlug}</span>` : this._createDTagHint()}
      </button>
    `;
  }

  /** Select the entity a plugin's create form created or found */
  private _onEntityCreated(e: CustomEvent<CreatedEntity>): void {
    const { dTag, pubkey, displayName } = e.detail;
    const tags = [['d', dTag], ...(displayName ? [['title', displayName]] : [])];
    // Selected while _creating still says which unlinked entity it replaces
    this._onSelect({ kind: 30818, pubkey, tags, content: '', created_at: 0, id: '', sig: '' });
    this._creating = undefined;
  }

  /** Select the entity the dialog just published */
  private _onEntityPublished(e: CustomEvent): void {
    const signed = e.detail?.results?.signedEvent as WikiEvent | undefined;
    const dTag = (e.detail?.dTag as string | undefined) ?? '';
    if (signed && dTag) this._onSelect(signed);
    this._creating = undefined;
  }

  /** Overlay shared by the create dialog and the preview */
  private _renderModal(title: string, body: unknown, onClose: () => void) {
    return renderModal({ title, body, closeLabel: this._m.close, onClose });
  }

  private _renderCreateDialog() {
    const creating = this._creating;
    if (!creating) return nothing;
    return this._renderModal(
      this._m.createDialogTitle(creating.manifest.metadata?.name),
      creating.creatorTag
        ? staticHtml`<${unsafeStatic(creating.creatorTag)}
            .manifest=${creating.manifest}
            .query=${this._query}
            .relays=${this._relays}
            @wiki-entity-created=${(e: CustomEvent<CreatedEntity>) => this._onEntityCreated(e)}
          ></${unsafeStatic(creating.creatorTag)}>`
        : html`
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
    // Unknown types: <nostr-wiki-view> shows the article text (STANDARD_WIKI_MANIFEST)
    const manifest = getEntityManifest(this._config.entityManifest);
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
        title=${this._m.preview}
        aria-label=${this._m.previewLabel(dTag)}
        @click=${open}
        @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
      >👁</button>
    `;
  }

  private _renderResult({ event, versions }: EntitySearchResult) {
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
              ${this._m.versions(versions)}
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
    const picked = this._picked;
    if (picked.length > 0 && !this._config.multiple) {
      return html`<div class="picked">${this._renderPicked(picked[0] as WikiEntityData)}</div>
        ${this._renderPreview()}`;
    }

    const showDropdown =
      this._searching ||
      this._results.length > 0 ||
      (this._query.length >= this._minLen && !this._searching);

    return html`
      <div class="picker">
        ${picked.filter(isShown).map((entity) => this._renderPicked(entity))}
        <input
          class="search-input"
          type="search"
          placeholder=${this._m.searchPlaceholder}
          .value=${this._query}
          @input=${this._onInput}
          aria-label=${this._m.searchLabel}
          autocomplete="off"
        />
        ${
          showDropdown
            ? html`
              <div class="dropdown" role="listbox">
                ${this._searching ? html`<div class="status-row">${this._m.searching}</div>` : nothing}
                ${this._results.map((result) => this._renderResult(result))}
                ${
                  !this._searching && this._query.length >= this._minLen
                    ? this._renderCreateOption()
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

// Register plugin and set the elements the composer uses: the input, and the pages to create
const tagNames = {
  inputTagName: 'wiki-entity-picker',
  publishSummaryTagName: 'np-wiki-entity-publish',
};
const entry = pluginRegistry.get('wiki-entity-picker');
if (entry) Object.assign(entry, tagNames);
else pluginRegistry.register({ ...wikiEntityPickerPlugin, ...tagNames });

declare global {
  interface HTMLElementTagNameMap {
    'wiki-entity-picker': WikiEntityPicker;
  }
}
