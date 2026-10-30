/**
 * @nostr-post/plugin-wiki-entity - A picked entity's chip in <wiki-entity-picker>
 *
 * A picked entity shows its name and slug; an unlinked one (no page yet, e.g. a performer read
 * from a post) shows its name with "Create page", which opens the create dialog with its name
 * and links filled in. One whose page was found automatically says how, to check it in its
 * preview, where "It's them" / "Not them" confirm or drop the page (`renderMatchActions`).
 */

import { html, nothing, type TemplateResult } from 'lit';
import type { WikiEntityData } from './core';
import { isUnconfirmed } from './entityMatch';
import type { WikiEntityPickerMessages } from './pickerMessages';

export interface PickedChipActions {
  messages: WikiEntityPickerMessages;
  onRemove: () => void;
  /** Creates the page of an unlinked entity */
  onCreate: () => void;
  /** The preview button of a picked entity */
  preview: (dTag: string) => unknown;
}

/** Whether the chip shows: an unlinked value without a name only keeps an event's links */
export const isShown = (entity: WikiEntityData): boolean =>
  !entity.unlinked || Boolean(entity.displayName);

export const renderPickedChip = (
  entity: WikiEntityData,
  { messages: m, onRemove, onCreate, preview }: PickedChipActions
): TemplateResult => html`
  <div
    class="selected ${entity.unlinked ? 'unlinked' : ''} ${isUnconfirmed(entity) ? 'unconfirmed' : ''}"
  >
    <span class="selected-name">${entity.displayName ?? entity.dTag}</span>
    ${
      entity.unlinked
        ? html`<span class="selected-slug">${m.noPage}</span>
            <button type="button" class="chip-create" @click=${onCreate}>${m.createPage}</button>`
        : html`<span class="selected-slug"
              >${entity.match ? m.foundBy(entity.match.by) : entity.dTag}</span
            >${preview(entity.dTag)}`
    }
    <button type="button" class="clear-btn" @click=${onRemove} aria-label=${m.remove}>×</button>
  </div>
`;

export interface MatchActions {
  messages: WikiEntityPickerMessages;
  onConfirm: () => void;
  onReject: () => void;
}

/** Under the preview of a page found automatically: is it this entity's? */
export const renderMatchActions = (
  entity: WikiEntityData | undefined,
  { messages: m, onConfirm, onReject }: MatchActions
): TemplateResult | typeof nothing =>
  entity && isUnconfirmed(entity)
    ? html`<div class="match-actions">
        <button type="button" class="match-confirm" @click=${onConfirm}>${m.itsThem}</button>
        <button type="button" class="match-reject" @click=${onReject}>${m.notThem}</button>
      </div>`
    : nothing;
