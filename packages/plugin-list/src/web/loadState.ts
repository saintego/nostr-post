/** <np-list-save>'s and <np-list-input>'s line for what loading waits for, or why it failed */

import { html, nothing } from 'lit';
import type { MyListsState } from '../myLists';
import type { ListMessages } from './listMessages';

/** What the loading waits for, or why it failed (with a retry) */
export function renderLoadState(state: MyListsState, m: ListMessages, retry: () => void) {
  if (state.error) {
    return html`<div class="error">
      ${state.error}
      <button type="button" @click=${retry}>${m.retry}</button>
    </div>`;
  }
  if (state.waitingForSigner) return html`<div class="muted">${m.waitingForSigner}</div>`;
  if (!state.lists) return html`<div class="muted">${m.loading}</div>`;
  return nothing;
}
