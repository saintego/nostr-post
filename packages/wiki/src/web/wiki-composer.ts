import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { fetchEvents, signAndPublish } from '@nostr-post/signer';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { interpolateTemplate } from '../identity';
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

/** An empty number input clears the value instead of storing 0. */
const parseNumberInput = (raw: string): number | undefined =>
  raw === '' ? undefined : Number(raw);

@customElement('nostr-wiki-composer')
export class NostrWikiComposer extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    * { box-sizing: border-box; }

    form.nostr-wiki-composer {
      border: 1px solid var(--nl-border, #e5e7eb);
      border-radius: 8px;
      background: var(--nl-bg, white);
      overflow: hidden;
    }

    /* ── Header ── */
    .wiki-composer-header {
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid var(--nl-border, #e5e7eb);
      background: var(--nl-card-bg, #f9fafb);
    }
    .wiki-composer-header h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.125rem 0;
      color: var(--nl-text, #111827);
    }
    .wiki-composer-header small {
      font-size: 0.75rem;
      color: var(--nl-text-secondary, #6b7280);
    }

    /* ── Fields ── */
    .wiki-fields {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .wiki-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--nl-text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    input[type="text"],
    input[type="number"],
    select,
    textarea {
      width: 100%;
      padding: 0.45rem 0.7rem;
      border: 1px solid var(--nl-border, #d1d5db);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--nl-text, #111827);
      background: var(--nl-input-bg, #f9fafb);
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    input[type="text"]:focus,
    input[type="number"]:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: var(--nl-primary, #6366f1);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    textarea {
      min-height: 90px;
      resize: vertical;
      line-height: 1.55;
    }

    select { cursor: pointer; }

    /* ── Plugin web components ── */
    .wiki-field > [id^="field-"] { width: 100%; }

    /* ── Error ── */
    .wiki-error {
      margin: 0 1.25rem 0.75rem;
      padding: 0.5rem 0.75rem;
      color: #dc2626;
      font-size: 0.8rem;
      background: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 6px;
    }

    /* ── Actions ── */
    .wiki-composer-actions {
      padding: 0.875rem 1.25rem;
      border-top: 1px solid var(--nl-border, #e5e7eb);
      background: var(--nl-card-bg, #f9fafb);
      display: flex;
      justify-content: flex-end;
    }

    button[type="submit"] {
      padding: 0.45rem 1.25rem;
      background: var(--nl-primary, #6366f1);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    button[type="submit"]:hover:not(:disabled) { background: var(--nl-primary-hover, #4f46e5); }
    button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }

    /* ── State messages ── */
    p {
      padding: 1.5rem;
      text-align: center;
      color: var(--nl-text-secondary, #6b7280);
      margin: 0;
    }

    /* ── Identity preview ── */
    .wiki-identity-preview {
      margin-top: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--nl-info-bg, #eff6ff);
      border: 1px solid var(--nl-info-border, #bfdbfe);
      border-radius: 6px;
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .preview-label { color: var(--nl-text-secondary, #6b7280); margin-right: 0.3rem; }
    .preview-value { font-weight: 500; }
    .preview-dtag  { font-family: monospace; color: var(--nl-accent, #2563eb); }

    /* ── Dark mode ── */
    :host-context(.dark) form.nostr-wiki-composer { background: #1f2937; border-color: #374151; }
    :host-context(.dark) .wiki-composer-header,
    :host-context(.dark) .wiki-composer-actions  { background: #111827; border-color: #374151; }
    :host-context(.dark) .wiki-composer-header h3 { color: #f3f4f6; }
    :host-context(.dark) input[type="text"],
    :host-context(.dark) input[type="number"],
    :host-context(.dark) select,
    :host-context(.dark) textarea {
      background: #374151;
      border-color: #4b5563;
      color: #f3f4f6;
    }
  `;
  @property({ type: String, attribute: 'entity-id' })
  entityId?: string;

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ attribute: false })
  resolver: WikiResolverFunction = defaultResolver;

  @property({ type: Array })
  relays: string[] = DEFAULT_WIKI_RELAYS;

  @property({ type: Boolean, attribute: 'auto-publish' })
  autoPublish = false;

  /** Initial form values for a new entity (used when no existing version is loaded) */
  @property({ attribute: false })
  prefill?: Record<string, unknown>;

  @state() private _loading = false;
  @state() private _publishing = false;
  @state() private _error?: string;
  @state() private _formData: Record<string, unknown> = {};
  @state() private _baseEvent?: WikiEvent;
  @state() private _published = false;

  private _fetchId = 0;
  /** Identity of the last load; manifest edits that keep it don't discard input. */
  private _loadedKey?: string;

  private get _wikiConfig() {
    return (this.manifest as WikiManifest | undefined)?.wikiConfig;
  }

  private get _previewTitle(): string | undefined {
    const t = this._wikiConfig?.titleTemplate;
    if (!t) return undefined;
    const result = interpolateTemplate(t, this._formData);
    return result || undefined;
  }

  private get _previewDTag(): string | undefined {
    const cfg = this._wikiConfig;
    if (!cfg) return undefined;
    if (cfg.dTagTemplate) {
      const r = interpolateTemplate(cfg.dTagTemplate, this._formData);
      return r ? normalizeDTag(r) : undefined;
    }
    if (cfg.titleTemplate && this._previewTitle) {
      return normalizeDTag(this._previewTitle);
    }
    return undefined;
  }

  // First fetch happens in the initial updated() call, which reports every
  // property set before the first render — no separate connectedCallback fetch.
  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('entityId') && !changed.has('manifest')) return;
    // A new manifest object with the same id/version (e.g. a React parent
    // re-rendering an inline manifest) must not wipe what the user typed.
    const key = this.manifest
      ? `${this.manifest.id}@${this.manifest.version}|${this.entityId ?? ''}`
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
      return;
    }

    this._loading = true;
    this._error = undefined;
    this._published = false;

    try {
      const raw = await fetchEvents(
        { kinds: [WIKI_KIND], '#d': [this.entityId], limit: 50 } as never,
        this.relays,
        // Prefill from the newest version across all relays, not the first answer
        { waitForAll: true, relayTimeoutMs: 5000 }
      );
      if (fetchId !== this._fetchId) return;
      const events = raw as unknown as WikiEvent[];
      const winner = this.resolver(events);
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
    this.dispatchEvent(
      new CustomEvent('nostr-wiki-field-change', {
        detail: { fieldId, value, formData: this._formData },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _onSave(): Promise<void> {
    if (!this.manifest) return;
    const validationError = validateWikiForm(this.manifest, this._formData);
    if (validationError) {
      this._error = validationError;
      return;
    }
    this._publishing = true;
    this._error = undefined;

    try {
      const titleFieldId = this._titleFieldId();
      const titleValue = titleFieldId
        ? (this._formData[titleFieldId] as string | undefined)
        : undefined;
      const explicitDTag = this.entityId?.trim() || undefined;
      const unsignedEvent = explicitDTag
        ? manifestToWikiEvent(this.manifest, this._formData, { dTag: explicitDTag })
        : manifestToWikiEvent(this.manifest, this._formData);
      const dTag =
        explicitDTag ||
        unsignedEvent.tags.find((tag) => tag[0] === 'd')?.[1] ||
        (titleValue ? normalizeDTag(titleValue) : normalizeDTag(this.manifest.id));

      if (this.autoPublish) {
        const results = await signAndPublish(unsignedEvent, this.relays);
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

  override render() {
    if (!this.manifest) return html`<p>No manifest provided.</p>`;
    if (this._loading) return html`<slot name="loading"><p>Loading entity…</p></slot>`;
    if (this._published) return html`<slot name="success"><p>Published successfully.</p></slot>`;

    return html`
      <form class="nostr-wiki-composer" @submit=${(e: Event) => {
        e.preventDefault();
        void this._onSave();
      }}>
        <header class="wiki-composer-header">
          <h3>${this._baseEvent ? `Edit: ${this._headerTitle()}` : 'New entity'}</h3>
          ${this._baseEvent ? html`<small>Forking from ${this._baseEvent.pubkey.slice(0, 8)}…</small>` : nothing}
          ${
            this._wikiConfig
              ? html`
            <div class="wiki-identity-preview">
              <span class="preview-item">
                <span class="preview-label">Title:</span>
                <span class="preview-value">${this._previewTitle ?? html`<em>—</em>`}</span>
              </span>
              <span class="preview-item">
                <span class="preview-label">d-tag:</span>
                <code class="preview-dtag">${this._previewDTag ?? html`<em>—</em>`}</code>
              </span>
            </div>
          `
              : nothing
          }
        </header>

        <div class="wiki-fields">
          ${this.manifest.fields
            .filter((f) => f.visibility?.edit !== 'hidden' && !f.attachTo)
            .map((f) => this._renderField(f))}
        </div>

        ${this._error ? html`<p class="wiki-error" role="alert">${this._error}</p>` : nothing}

        <div class="wiki-composer-actions">
          <button type="submit" ?disabled=${this._publishing}>
            ${this._publishing ? 'Publishing…' : 'Publish'}
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
    const label = (f.metadata?.label as string | undefined) ?? f.id;

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
        ${control}
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
      return this._renderSelect(f, value, f.options as string[]);
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

  private _renderSelect(f: PostField, value: unknown, options: string[]) {
    return html`
      <select
        id="field-${f.id}"
        ?required=${f.required}
        @change=${(e: Event) => this._onFieldChange(f.id, (e.target as HTMLSelectElement).value)}
      >
        <option value="" ?selected=${!value}>— select —</option>
        ${options.map((opt) => html`<option value=${opt} ?selected=${opt === value}>${opt}</option>`)}
      </select>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-wiki-composer': NostrWikiComposer;
  }
}
