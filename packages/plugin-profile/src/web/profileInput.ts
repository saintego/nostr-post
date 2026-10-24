/**
 * @nostr-post/plugin-profile - <np-profile-input>
 *
 * People picker: search profiles by name (NIP-50 search relays) or paste an npub/nprofile;
 * each picked person can get a role (suggestions from `metadata.roles`).
 * Accepts .value (Person[]) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: Person[] | undefined } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { fetchProfiles, type NostrProfile } from '@nostr-post/signer';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import {
  fieldRoles,
  type Person,
  peopleOf,
  personFromText,
  withoutPerson,
  withPerson,
} from '../core';
import { type FoundProfile, profileName, searchProfiles } from '../search';
import { DEFAULT_PROFILE_MESSAGES, type ProfileMessages } from './profileMessages';
import { renderAvatar, renderPersonName } from './profileParts';
import { profileStyles } from './profileStyles';

/** Wait this long after typing before searching */
const SEARCH_DELAY_MS = 350;

@customElement('np-profile-input')
export class NpProfileInput extends LitElement {
  static override styles = profileStyles;

  @property({ type: Array }) value?: Person[];
  @property({ type: Object }) field?: PostField;
  @property({ type: Object }) messages: Partial<ProfileMessages> = {};

  @state() _query = '';
  /** Search results; undefined while there's no search */
  @state() _results?: FoundProfile[];
  @state() _searching = false;
  @state() _error = '';
  /** Profiles of found and picked people, by pubkey */
  @state() _profiles = new Map<string, NostrProfile>();

  _timer?: ReturnType<typeof setTimeout>;
  /** Counts searches, so an older, slower one doesn't replace a newer one's results */
  _searches = 0;

  get _m(): ProfileMessages {
    return { ...DEFAULT_PROFILE_MESSAGES, ...this.messages };
  }

  get _people(): Person[] {
    return peopleOf(this.value);
  }

  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('value')) return;
    const missing = this._people.map((p) => p.pubkey).filter((pk) => !this._profiles.has(pk));
    if (missing.length === 0) return;
    void fetchProfiles(missing).then((found) => {
      if (found.size > 0) this._profiles = new Map([...this._profiles, ...found]);
    });
  }

  _emit(people: Person[]): void {
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: people.length > 0 ? people : undefined },
        bubbles: true,
        composed: true,
      })
    );
  }

  _pick(person: Person, profile?: NostrProfile): void {
    if (profile) this._profiles = new Map([...this._profiles, [person.pubkey, profile]]);
    this._emit(withPerson(this._people, person));
    this._query = '';
    this._results = undefined;
  }

  _onQuery(text: string): void {
    this._query = text;
    clearTimeout(this._timer);
    // A pasted npub, nprofile or key: that person, no search
    const pasted = personFromText(text);
    if (pasted) {
      this._pick(pasted);
      return;
    }
    if (text.trim().length < 2) {
      this._results = undefined;
      return;
    }
    this._timer = setTimeout(() => void this._search(text), SEARCH_DELAY_MS);
  }

  async _search(text: string): Promise<void> {
    const search = ++this._searches;
    this._searching = true;
    this._error = '';
    const relays = this.field?.metadata?.searchRelays;
    try {
      const results = await searchProfiles(text, {
        relays: Array.isArray(relays) ? (relays as string[]) : undefined,
      });
      if (search === this._searches) this._results = results;
    } catch (error) {
      if (search === this._searches) {
        this._error = this._m.searchFailed(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (search === this._searches) this._searching = false;
    }
  }

  _renderResults() {
    const m = this._m;
    if (this._error) return html`<div class="results"><div class="note">${this._error}</div></div>`;
    if (this._searching && !this._results) {
      return html`<div class="results"><div class="note">${m.searching}</div></div>`;
    }
    if (!this._results) return nothing;
    if (this._results.length === 0) {
      return html`<div class="results"><div class="note">${m.noResults}</div></div>`;
    }
    return html`<div class="results" role="listbox">
      ${this._results.map(
        ({ pubkey, profile }) => html`
          <button
            type="button"
            class="result"
            role="option"
            @click=${() => this._pick({ pubkey }, profile)}
          >
            ${renderAvatar(profile)}
            <span class="name">${profileName(pubkey, profile)}</span>
            ${profile.nip05 ? html`<span class="nip05">${profile.nip05}</span>` : nothing}
          </button>
        `
      )}
    </div>`;
  }

  override render() {
    const m = this._m;
    const roles = fieldRoles(this.field);
    return html`
      <div class="people">
        ${this._people.map((person) => {
          const profile = this._profiles.get(person.pubkey);
          const name = profileName(person.pubkey, profile);
          return html`
            <div class="person">
              ${renderPersonName(person.pubkey, profile)}
              <input
                class="role-input"
                list="np-profile-roles"
                aria-label=${m.role}
                placeholder=${m.rolePlaceholder}
                .value=${person.role ?? ''}
                @change=${(e: Event) => {
                  const role = (e.target as HTMLInputElement).value.trim();
                  const { role: _old, ...rest } = person;
                  this._emit(
                    withPerson(
                      withoutPerson(this._people, person.pubkey),
                      role ? { ...rest, role } : rest
                    )
                  );
                }}
              />
              <button
                type="button"
                class="remove"
                aria-label=${m.remove(name)}
                @click=${() => this._emit(withoutPerson(this._people, person.pubkey))}
              >
                ×
              </button>
            </div>
          `;
        })}
      </div>
      <datalist id="np-profile-roles">
        ${roles.map((role) => html`<option value=${role}></option>`)}
      </datalist>
      <div class="search">
        <input
          type="search"
          autocomplete="off"
          placeholder=${m.searchPlaceholder}
          aria-label=${m.searchPlaceholder}
          .value=${live(this._query)}
          @input=${(e: Event) => this._onQuery((e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Escape') this._results = undefined;
          }}
        />
        ${this._renderResults()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-profile-input': NpProfileInput;
  }
}
