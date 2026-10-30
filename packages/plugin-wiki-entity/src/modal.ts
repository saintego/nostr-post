/**
 * @nostr-post/plugin-wiki-entity - The picker's overlay (create dialog, preview)
 *
 * Closes on its × button or a click on the backdrop. A press that began inside the dialog
 * (e.g. selecting text and letting go outside) doesn't close it.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';

/** Events from the create dialog's composer that must not reach the form around the picker */
const DIALOG_EVENTS = [
  'np-value-changed',
  'nostr-wiki-field-change',
  'nostr-wiki-submit',
  'nostr-wiki-published',
  'nostr-wiki-error',
  'wiki-entity-create',
];

const isolated = new WeakSet<Element>();

/** Keep the dialog's events from reaching the form around the picker */
const isolate = (el?: Element) => {
  if (!el || isolated.has(el)) return;
  isolated.add(el);
  for (const type of DIALOG_EVENTS) el.addEventListener(type, (e) => e.stopPropagation());
};

/** Backdrops whose last press began on themselves */
const pressed = new WeakSet<EventTarget>();

const onBackdrop = (e: Event) => e.target === e.currentTarget;

export interface ModalOptions {
  title: string;
  body: unknown;
  /** Label of the × button */
  closeLabel: string;
  onClose: () => void;
}

export const renderModal = ({ title, body, closeLabel, onClose }: ModalOptions) => html`
  <div
    class="modal-backdrop"
    @pointerdown=${(e: Event) => {
      if (!e.currentTarget) return;
      if (onBackdrop(e)) pressed.add(e.currentTarget);
      else pressed.delete(e.currentTarget);
    }}
    @click=${(e: Event) => {
      if (e.currentTarget && pressed.has(e.currentTarget) && onBackdrop(e)) onClose();
      if (e.currentTarget) pressed.delete(e.currentTarget);
    }}
  >
    <div class="modal" role="dialog" aria-modal="true" aria-label=${title} ${ref(isolate)}>
      <div class="modal-header">
        <span>${title}</span>
        <button type="button" class="clear-btn" aria-label=${closeLabel} @click=${onClose}>×</button>
      </div>
      <div class="modal-body">${body}</div>
    </div>
  </div>
`;
