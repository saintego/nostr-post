import { groupFieldOptions, optionLabel } from '@nostr-post/core/enumOptions';
import { fieldDescription, fieldLabel } from '@nostr-post/core/manifest';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { getPublishRelays, publishToRelays, signEvent } from '@nostr-post/signer';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import {
  distinguishingFieldLabels,
  distinguishingSuggestions,
  entityDTagFor,
  entityTitleFor,
} from '../disambiguation';
import { checkEntityDTag, fetchEntityVersions } from '../fetch';
import {
  DEFAULT_WIKI_RELAYS,
  WIKI_KIND,
  manifestToWikiEvent,
  wikiEventToManifestData,
} from '../nip54';
import { normalizeDTag } from '../normalizeDTag';
import type { WikiEvent, WikiResolverFunction } from '../resolver';
import { defaultResolver } from '../resolver';
import type { WikiManifest } from '../types';
import { validateWikiForm } from '../validate';
import {
  DEFAULT_WIKI_COMPOSER_MESSAGES,
  type WikiComposerMessages,
} from './wiki-composer-messages';
import { type SlugStatus, renderSlugCheck } from './wiki-composer-slug';
import { composerStyles } from './wiki-composer-styles';

/** An empty number input clears the value instead of storing 0. */
const parseNumberInput = (raw: string): number | undefined =>
  raw === '' ? undefined : Number(raw);

@customElement('nostr-wiki-composer')
export class NostrWikiComposer extends LitElement {
  static styles = composerStyles;
  @property({ type: String, attribute: 'entity-id' })
  entityId?: string;

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ attribute: false })
  resolver: WikiResolverFunction = defaultResolver;

  /** Relays to load entities from and publish to; publishing also adds the author's own relays */
  @property({ type: Array })
  relays: string[] = DEFAULT_WIKI_RELAYS;

  @property({ type: Boolean, attribute: 'auto-publish' })
  autoPublish = false;

  /** Edit from this version instead of the newest one (e.g. an older or another author's) */
  @property({ attribute: false })
  baseEvent?: WikiEvent;

  /** Overrides for the composer's user-facing text (e.g. translations) */
  @property({ attribute: false })
  messages?: Partial<WikiComposerMessages>;

  /** Initial form values for a new entity (used when no existing version is loaded) */
  @property({ attribute: false })
  prefill?: Record<string, unknown>;

  @state() private _loading = false;
  @state() private _publishing = false;
  @state() private _error?: string;
  @state() private _formData: Record<string, unknown> = {};
  @state() private _baseEvent?: WikiEvent;
  @state() private _published = false;
  /** Text added to a new entity's name to make its d-tag distinct */
  @state() private _qualifier = '';
  /** Whether a new entity's d-tag is already used by another entity */
  @state() private _dTagStatus: SlugStatus = 'idle';
  private _checkTimer?: ReturnType<typeof setTimeout>;
  private _checkId = 0;

  private _fetchId = 0;
  /** Identity of the last load; manifest edits that keep it don't discard input. */
  private _loadedKey?: string;

  private get _wikiConfig() {
    return (this.manifest as WikiManifest | undefined)?.wikiConfig;
  }

  /** The qualifier, if this is a new entity whose slug needed one */
  private get _activeQualifier(): string {
    return this._isNew ? this._qualifier.trim() : '';
  }

  private get _previewTitle(): string | undefined {
    if (!this.manifest) return undefined;
    return entityTitleFor(this.manifest, this._formData, this._activeQualifier);
  }

  private get _m(): WikiComposerMessages {
    return { ...DEFAULT_WIKI_COMPOSER_MESSAGES, ...this.messages };
  }

  /** Creating a new entity (no existing version loaded) */
  private get _isNew(): boolean {
    return !this._baseEvent && !this.entityId;
  }

  private get _previewDTag(): string | undefined {
    if (!this.manifest) return undefined;
    return entityDTagFor(this.manifest, this._formData, this._activeQualifier);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._checkTimer);
  }

  /** Re-check (debounced) whether a new entity's d-tag is taken by another entity */
  private _scheduleDTagCheck(): void {
    clearTimeout(this._checkTimer);
    const checkId = ++this._checkId;
    const dTag = this._previewDTag;
    if (!this._isNew || !dTag) {
      this._dTagStatus = 'idle';
      return;
    }
    this._dTagStatus = 'checking';
    this._checkTimer = setTimeout(async () => {
      const status = await checkEntityDTag(dTag, this.relays).catch(() => 'unknown' as const);
      if (checkId === this._checkId) this._dTagStatus = status;
    }, 400);
  }

  private _setQualifier(qualifier: string): void {
    this._qualifier = qualifier;
    this._scheduleDTagCheck();
  }

  // First fetch happens in the initial updated() call, which reports every
  // property set before the first render — no separate connectedCallback fetch.
  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('entityId') && !changed.has('manifest') && !changed.has('baseEvent')) return;
    // A new manifest object with the same id/version (e.g. a React parent
    // re-rendering an inline manifest) must not wipe what the user typed.
    const key = this.manifest
      ? `${this.manifest.id}@${this.manifest.version}|${this.entityId ?? ''}|${this.baseEvent?.id ?? ''}`
      : undefined;
    if (key === this._loadedKey) return;
    this._loadedKey = key;
    void this._fetch();
  }

  private _titleFieldId(): string | undefined {
    return this.manifest?.fields.find((f) => {
      const targets = Array.isArray(f.mapTo) ? f.mapTo : [f.mapTo];
      return targets.some(
        (t) => t.kind === WIKI_KIND && t.target === 'tag' && t.tagName === 'title'
      );
    })?.id;
  }

  private async _fetch(): Promise<void> {
    const fetchId = ++this._fetchId;

    if (!this.manifest || !this.entityId) {
      this._formData = { ...this.prefill };
      this._baseEvent = undefined;
      this._loading = false;
      this._error = undefined;
      this._published = false;
      this._qualifier = '';
      this._scheduleDTagCheck();
      return;
    }

    this._loading = true;
    this._error = undefined;
    this._published = false;

    try {
      // Prefill from the chosen version, else the newest across all relays
      const winner =
        this.baseEvent ?? this.resolver(await fetchEntityVersions(this.entityId, this.relays));
      if (fetchId !== this._fetchId) return;
      if (winner) {
        this._baseEvent = winner;
        this._formData = wikiEventToManifestData(winner, this.manifest);
      } else {
        this._baseEvent = undefined;
        this._formData = { ...this.prefill };
      }
    } catch (err) {
      if (fetchId !== this._fetchId) return;
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      if (fetchId === this._fetchId) this._loading = false;
    }
  }

  private _onFieldChange(fieldId: string, value: unknown): void {
    this._formData = { ...this._formData, [fieldId]: value };
    this._scheduleDTagCheck();
    this.dispatchEvent(
      new CustomEvent('nostr-wiki-field-change', {
        detail: { fieldId, value, formData: this._formData },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** The event to publish and its d-tag: the edited entity's, a distinguished new one, or the template's */
  private _buildEvent(manifest: NostrPostManifest) {
    const titleFieldId = this._titleFieldId();
    const titleValue = titleFieldId
      ? (this._formData[titleFieldId] as string | undefined)
      : undefined;
    const qualified = !!this._activeQualifier;
    const explicitDTag = this.entityId?.trim() || (qualified ? this._previewDTag : undefined);
    const unsignedEvent = manifestToWikiEvent(manifest, this._formData, {
      dTag: explicitDTag,
      title: qualified ? this._previewTitle : undefined,
    });
    const dTag =
      explicitDTag ||
      unsignedEvent.tags.find((tag) => tag[0] === 'd')?.[1] ||
      normalizeDTag(titleValue || manifest.id);
    return { unsignedEvent, dTag };
  }

  private async _onSave(): Promise<void> {
    if (!this.manifest) return;
    const validationError = validateWikiForm(this.manifest, this._formData) ?? this._dTagError();
    if (validationError) {
      this._error = validationError;
      return;
    }
    this._publishing = true;
    this._error = undefined;

    try {
      const { unsignedEvent, dTag } = this._buildEvent(this.manifest);

      if (this.autoPublish) {
        // Wiki relays (where entities are looked up) plus the author's own relays
        const signedEvent = await signEvent(unsignedEvent);
        const relays = await getPublishRelays(signedEvent.pubkey, this.relays);
        const results = { signedEvent, publishResults: await publishToRelays(signedEvent, relays) };
        this.dispatchEvent(
          new CustomEvent('nostr-wiki-published', {
            detail: { event: unsignedEvent, results, dTag },
            bubbles: true,
            composed: true,
          })
        );
        this._published = true;
      } else {
        this.dispatchEvent(
          new CustomEvent('nostr-wiki-submit', {
            detail: { event: unsignedEvent, dTag },
            bubbles: true,
            composed: true,
          })
        );
      }
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      this.dispatchEvent(
        new CustomEvent('nostr-wiki-error', {
          detail: { error: err },
          bubbles: true,
          composed: true,
        })
      );
    } finally {
      this._publishing = false;
    }
  }

  /** Why a new entity can't be published under its d-tag yet, if it can't */
  private _dTagError(): string | undefined {
    if (!this._isNew) return undefined;
    if (this._dTagStatus === 'taken') return this._m.slugTaken(this._previewDTag ?? '');
    if (this._dTagStatus === 'checking') return this._m.checkingSlug;
    return undefined;
  }

  /** For a new entity: whether its slug is free, and a way to make it distinct */
  private _renderDisambiguation() {
    if (!this._isNew || !this.manifest) return nothing;
    return renderSlugCheck({
      status: this._dTagStatus,
      dTag: this._previewDTag ?? '',
      qualifier: this._qualifier,
      suggestions: distinguishingSuggestions(this.manifest, this._formData),
      placeholder: this._m.distinguishPlaceholder(distinguishingFieldLabels(this.manifest)),
      messages: this._m,
      onQualifier: (qualifier) => this._setQualifier(qualifier),
      onCheckAgain: () => this._scheduleDTagCheck(),
    });
  }

  override render() {
    const m = this._m;
    if (!this.manifest) return html`<p>${m.noManifest}</p>`;
    if (this._loading) return html`<slot name="loading"><p>${m.loading}</p></slot>`;
    if (this._published) return html`<slot name="success"><p>${m.published}</p></slot>`;

    return html`
      <form class="nostr-wiki-composer" @submit=${(e: Event) => {
        e.preventDefault();
        void this._onSave();
      }}>
        <header class="wiki-composer-header">
          <h3>${this._baseEvent ? m.editEntity(this._headerTitle()) : m.newEntity}</h3>
          ${this._baseEvent ? html`<small>${m.forkingFrom(this._baseEvent.pubkey.slice(0, 8))}</small>` : nothing}
          ${
            this._wikiConfig
              ? html`
            <div class="wiki-identity-preview">
              <span class="preview-item">
                <span class="preview-label">${m.titleLabel}</span>
                <span class="preview-value">${this._previewTitle ?? html`<em>—</em>`}</span>
              </span>
              <span class="preview-item">
                <span class="preview-label">${m.dTagLabel}</span>
                <code class="preview-dtag">${this._previewDTag ?? html`<em>—</em>`}</code>
              </span>
            </div>
          `
              : nothing
          }
        </header>

        ${this._renderDisambiguation()}

        <div class="wiki-fields">
          ${this.manifest.fields
            .filter((f) => f.visibility?.edit !== 'hidden' && !f.attachTo)
            .map((f) => this._renderField(f))}
        </div>

        ${this._error ? html`<p class="wiki-error" role="alert">${this._error}</p>` : nothing}

        <div class="wiki-composer-actions">
          <button type="submit" ?disabled=${this._publishing || !!this._dTagError()}>
            ${this._publishing ? m.publishing : m.publish}
          </button>
        </div>
      </form>
    `;
  }

  private _headerTitle(): string {
    const titleFieldId = this._titleFieldId();
    const fromField = titleFieldId ? this._formData[titleFieldId] : undefined;
    return String(this._previewTitle ?? fromField ?? this.entityId ?? '');
  }

  private _renderField(f: PostField) {
    const value = this._formData[f.id];
    const label = fieldLabel(f);
    const description = fieldDescription(f);
    const help = description
      ? html`<div class="wiki-field-description">${description}</div>`
      : nothing;

    if (f.visibility?.edit === 'readonly') {
      return html`
        <div class="wiki-field">
          <label>${label}</label>
          <span>${String(value ?? '')}</span>
        </div>
      `;
    }

    // Plugin web components aren't labelable elements, so their label has no `for`.
    const plugin = pluginRegistry.get(f.uiPlugin);
    const control = plugin?.inputTagName
      ? this._renderPluginControl(f, value, plugin.inputTagName)
      : this._renderNativeControl(f, value);
    return html`
      <div class="wiki-field">
        <label for=${ifDefined(plugin?.inputTagName ? undefined : `field-${f.id}`)}>
          ${label}${f.required ? ' *' : ''}
        </label>
        ${help} ${control}
      </div>
    `;
  }

  /** Plugin web component (stars, wiki-entity-picker, …). */
  private _renderPluginControl(f: PostField, value: unknown, tagName: string) {
    const tag = unsafeStatic(tagName);
    return staticHtml`<${tag}
      id=${`field-${f.id}`}
      .value=${value}
      .field=${f}
      @np-value-changed=${(e: CustomEvent) => this._onFieldChange(f.id, e.detail.value)}
    ></${tag}>`;
  }

  private _renderNativeControl(f: PostField, value: unknown) {
    const placeholder = (f.metadata?.placeholder as string | undefined) ?? '';

    if (f.uiPlugin === 'textarea') {
      return html`
        <textarea
          id="field-${f.id}"
          .value=${String(value ?? '')}
          placeholder=${placeholder}
          ?required=${f.required}
          @input=${(e: InputEvent) => this._onFieldChange(f.id, (e.target as HTMLTextAreaElement).value)}
        ></textarea>
      `;
    }

    if ((f.uiPlugin === 'select' || f.type === 'enum') && f.options?.length) {
      return this._renderSelect(f, value);
    }

    // Number or text
    const isNumber = f.type === 'number';
    return html`
      <input
        id="field-${f.id}"
        type=${isNumber ? 'number' : 'text'}
        .value=${String(value ?? '')}
        placeholder=${placeholder}
        ?required=${f.required}
        @input=${(e: InputEvent) => {
          const raw = (e.target as HTMLInputElement).value;
          this._onFieldChange(f.id, isNumber ? parseNumberInput(raw) : raw);
        }}
      />
    `;
  }

  private _renderSelect(f: PostField, value: unknown) {
    return html`
      <select
        id="field-${f.id}"
        ?required=${f.required}
        @change=${(e: Event) => this._onFieldChange(f.id, (e.target as HTMLSelectElement).value)}
      >
        <option value="" ?selected=${!value}>${this._m.selectPlaceholder}</option>
        ${groupFieldOptions(f).map(({ group, options }) => {
          const items = options.map(
            (opt) =>
              html`<option value=${opt.value} title=${ifDefined(opt.description)} ?selected=${opt.value === value}>${optionLabel(opt)}</option>`
          );
          return group ? html`<optgroup label=${group}>${items}</optgroup>` : items;
        })}
      </select>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-wiki-composer': NostrWikiComposer;
  }
}
