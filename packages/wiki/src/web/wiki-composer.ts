import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { fetchEvents, signAndPublish } from '@nostr-post/signer';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import {
  DEFAULT_WIKI_RELAYS,
  WIKI_KIND,
  manifestToWikiEvent,
  wikiEventToManifestData,
} from '../nip54';
import { normalizeDTag } from '../normalizeDTag';
import type { WikiEvent, WikiResolverFunction } from '../resolver';
import { defaultResolver } from '../resolver';

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

  @state() private _loading = false;
  @state() private _publishing = false;
  @state() private _error?: string;
  @state() private _formData: Record<string, unknown> = {};
  @state() private _baseEvent?: WikiEvent;
  @state() private _published = false;

  override connectedCallback(): void {
    super.connectedCallback();
    void this._fetch();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('entityId') || changed.has('manifest')) {
      void this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    if (!this.manifest || !this.entityId) {
      this._formData = {};
      this._baseEvent = undefined;
      return;
    }

    this._loading = true;
    this._error = undefined;

    try {
      const raw = await fetchEvents(
        { kinds: [WIKI_KIND], '#d': [this.entityId] } as never,
        this.relays
      );
      const events = raw as unknown as WikiEvent[];
      const winner = this.resolver(events);
      this._baseEvent = winner ?? undefined;
      if (winner) this._formData = wikiEventToManifestData(winner, this.manifest);
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
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
    this._publishing = true;
    this._error = undefined;

    try {
      const titleField = this.manifest.fields.find((f) => {
        const targets = Array.isArray(f.mapTo) ? f.mapTo : [f.mapTo];
        return targets.some((t) => t.target === 'tag' && t.tagName === 'title');
      });
      const titleValue = titleField
        ? (this._formData[titleField.id] as string | undefined)
        : undefined;
      const dTag =
        this.entityId ?? (titleValue ? normalizeDTag(titleValue) : normalizeDTag(this.manifest.id));
      const unsignedEvent = manifestToWikiEvent(this.manifest, this._formData, { dTag });

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
          <h3>${this._baseEvent ? 'Edit: ' + String(this._formData['title'] ?? this.entityId ?? '') : 'New entity'}</h3>
          ${this._baseEvent ? html`<small>Forking from ${this._baseEvent.pubkey.slice(0, 8)}…</small>` : nothing}
        </header>

        <div class="wiki-fields">
          ${this.manifest.fields
            .filter((f) => f.visibility?.edit !== 'hidden')
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

  private _renderField(f: PostField) {
    const value = this._formData[f.id];
    const label = (f.metadata?.label as string | undefined) ?? f.id;
    const placeholder = (f.metadata?.placeholder as string | undefined) ?? '';

    if (f.visibility?.edit === 'readonly') {
      return html`
        <div class="wiki-field">
          <label>${label}</label>
          <span>${String(value ?? '')}</span>
        </div>
      `;
    }

    // Plugin web component (stars, wiki-entity-picker, …)
    const plugin = pluginRegistry.get(f.uiPlugin);
    if (plugin?.inputTagName) {
      const tag = unsafeStatic(plugin.inputTagName);
      return html`
        <div class="wiki-field">
          <label>${label}${f.required ? ' *' : ''}</label>
          ${staticHtml`<${tag}
            id="field-${unsafeStatic(f.id)}"
            .value=${value}
            .field=${f}
            @np-value-changed=${(e: CustomEvent) => this._onFieldChange(f.id, e.detail.value)}
          ></${tag}>`}
        </div>
      `;
    }

    // Textarea
    if (f.uiPlugin === 'textarea') {
      return html`
        <div class="wiki-field">
          <label for="field-${f.id}">${label}${f.required ? ' *' : ''}</label>
          <textarea
            id="field-${f.id}"
            .value=${String(value ?? '')}
            placeholder=${placeholder}
            ?required=${f.required}
            @input=${(e: InputEvent) => this._onFieldChange(f.id, (e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </div>
      `;
    }

    // Select / enum
    if ((f.uiPlugin === 'select' || f.type === 'enum') && f.options?.length) {
      return html`
        <div class="wiki-field">
          <label for="field-${f.id}">${label}${f.required ? ' *' : ''}</label>
          <select
            id="field-${f.id}"
            ?required=${f.required}
            @change=${(e: Event) => this._onFieldChange(f.id, (e.target as HTMLSelectElement).value)}
          >
            <option value="" ?selected=${!value}>— select —</option>
            ${(f.options as string[]).map(
              (opt) => html`
              <option value=${opt} ?selected=${opt === value}>${opt}</option>
            `
            )}
          </select>
        </div>
      `;
    }

    // Number or text
    return html`
      <div class="wiki-field">
        <label for="field-${f.id}">${label}${f.required ? ' *' : ''}</label>
        <input
          id="field-${f.id}"
          type=${f.type === 'number' ? 'number' : 'text'}
          .value=${String(value ?? '')}
          placeholder=${placeholder}
          ?required=${f.required}
          @input=${(e: InputEvent) => {
            const raw = (e.target as HTMLInputElement).value;
            this._onFieldChange(f.id, f.type === 'number' ? Number(raw) : raw);
          }}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-wiki-composer': NostrWikiComposer;
  }
}
