/**
 * @nostr-post/plugin-profile - <np-profile-view>
 *
 * The people of a field: avatar, name and role. Accepts .value (Person[]) and .field.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { fetchProfiles, type NostrProfile } from '@nostr-post/signer';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type Person, peopleOf } from '../core';
import { renderPersonName } from './profileParts';
import { profileStyles } from './profileStyles';

@customElement('np-profile-view')
export class NpProfileView extends LitElement {
  static override styles = profileStyles;

  @property({ type: Array }) value?: Person[];
  @property({ type: Object }) field?: PostField;

  @state() _profiles = new Map<string, NostrProfile>();

  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('value')) return;
    const people = peopleOf(this.value);
    if (people.length === 0) return;
    void fetchProfiles(
      people.map((p) => p.pubkey),
      { hints: people.flatMap((p) => (p.relay ? [p.relay] : [])) }
    ).then((found) => {
      this._profiles = found;
    });
  }

  override render() {
    const people = peopleOf(this.value);
    if (people.length === 0) return nothing;
    return html`<div class="people">
      ${people.map(
        (person) => html`<div class="person">
          ${renderPersonName(person.pubkey, this._profiles.get(person.pubkey), person.role)}
        </div>`
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-profile-view': NpProfileView;
  }
}
