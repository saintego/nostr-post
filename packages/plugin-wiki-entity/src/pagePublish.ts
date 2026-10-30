/**
 * @nostr-post/plugin-wiki-entity - <np-wiki-entity-publish>: next to the publish button
 * (publishSummaryTagName), a checkbox per picked entity without a page: create its page when the
 * post is published (`createPage`, see `createEntityPage`). Ticked for entities with links; one
 * known only by its name is left for the user to tick. Pages found automatically and not checked
 * yet are listed too (`match`), to check in the picker's preview.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { pickedEntities, type WikiEntityData } from './core';
import { isUnconfirmed } from './entityMatch';
import { createsPage } from './entityPage';
import {
  DEFAULT_WIKI_ENTITY_PICKER_MESSAGES,
  type WikiEntityPickerMessages,
} from './pickerMessages';

@customElement('np-wiki-entity-publish')
export class NpWikiEntityPublish extends LitElement {
  static override styles = css`
    :host { display: block; margin: 0.75rem 0; font-size: 0.85rem; }
    .pages {
      padding: 0.75rem 1rem;
      border: 1px solid var(--nl-border, #e5e7eb);
      border-radius: 0.5rem;
      background: var(--nl-card-bg, #f9fafb);
    }
    label { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
    .hint { margin: 0.15rem 0 0.5rem 1.4rem; color: var(--nl-text-secondary, #6b7280); }
    .check { margin-bottom: 0.4rem; color: #92400e; }

    :host-context(.dark) { color: #f3f4f6; }
    :host-context(.dark) .pages {
      border-color: var(--nl-border, #374151);
      background: var(--nl-card-bg, #1f2937);
    }
    :host-context(.dark) .hint { color: var(--nl-text-secondary, #9ca3af); }
    :host-context(.dark) .check { color: #fcd34d; }
  `;

  /** The picker's value: one entity, or a list (`metadata.multiple`) */
  @property({ attribute: false }) value: WikiEntityData | WikiEntityData[] | null = null;
  @property({ attribute: false }) field: PostField | null = null;
  /** Overrides for the user-facing text */
  @property({ attribute: false }) messages?: Partial<WikiEntityPickerMessages>;

  private _toggle(entity: WikiEntityData, createPage: boolean): void {
    const update = (e: WikiEntityData) => (e === entity ? { ...e, createPage } : e);
    const value = Array.isArray(this.value) ? this.value.map(update) : update(entity);
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  override render() {
    const m = { ...DEFAULT_WIKI_ENTITY_PICKER_MESSAGES, ...this.messages };
    const picked = pickedEntities(this.value);
    const withoutPage = picked.filter((e) => e.unlinked && e.displayName);
    const unconfirmed = picked.filter(isUnconfirmed);
    if (!withoutPage.length && !unconfirmed.length) return nothing;
    return html`<div class="pages">
      ${unconfirmed.map(
        (entity) =>
          html`<div class="check">${m.checkFound(entity.displayName ?? entity.dTag)}</div>`
      )}
      ${withoutPage.map(
        (entity) => html`<label>
            <input
              type="checkbox"
              .checked=${createsPage(entity)}
              @change=${(e: Event) => this._toggle(entity, (e.target as HTMLInputElement).checked)}
            />
            ${m.createOnPublish(entity.displayName ?? '')}
          </label>
          ${entity.externalIds.length ? nothing : html`<div class="hint">${m.nameOnly}</div>`}`
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-wiki-entity-publish': NpWikiEntityPublish;
  }
}
