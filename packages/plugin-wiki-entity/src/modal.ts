/**
 * @nostr-post/plugin-wiki-entity - The picker's overlay (create dialog, preview): an
 * <np-dialog> that also closes on a click on the backdrop, and keeps its content's events from
 * reaching the form around the picker.
 */

import '@nostr-post/ui/web/dialog';
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

export interface ModalOptions {
  title: string;
  body: unknown;
  /** Label of the Close button */
  closeLabel: string;
  onClose: () => void;
}

export const renderModal = ({ title, body, closeLabel, onClose }: ModalOptions) => html`
  <np-dialog
    open
    backdrop-close
    exportparts="dialog, header, button"
    heading=${title}
    .messages=${{ close: closeLabel }}
    @close=${onClose}
    ${ref(isolate)}
  >
    ${body}
  </np-dialog>
`;
