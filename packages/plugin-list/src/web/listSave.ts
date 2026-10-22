/**
 * @nostr-post/plugin-list - <np-list-save>
 *
 * A Save button for one thing (`target`: an `a` address such as a wiki entity, or an event
 * id): it opens the signed-in user's lists, to add it to or remove it from each, or to
 * start a new list with it. Lists load when it's first opened, since feeds show many.
 *
 * With `manifest` (the one the target was made with), its lists (`lists`) come first,
 * also those the user hasn't got yet: ticking one creates it.
 *
 * Dispatches 'np-list-change' with { detail: { list } } after a list was published.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { hasItem, itemFor, listWithTitle, manifestListPresets } from '../core';
import { addToList, createList, removeFromList } from '../lists';
import { listTitle, listTitles } from '../listTitles';
import { loadMyLists, type MyListsState, NOT_LOADED, shownLists } from '../myLists';
import { BOOKMARK_LISTS, type BookmarkList, type ListKind } from '../types';
import { DEFAULT_LIST_MESSAGES, type ListMessages } from './listMessages';
import { renderLoadState } from './loadState';
import { listStyles } from './styles';

@customElement('np-list-save')
export class NpListSave extends LitElement {
  static override styles = listStyles;

  /** What to save: an `a` address (e.g. `30818:<pubkey>:<d-tag>`) or an event id */
  @property() target = '';
  /** Relay hint saved with the item */
  @property() relay?: string;
  /** Relays besides the user's own */
  @property({ type: Array }) relays?: string[];
  /** The manifest the target was made with: its lists (`lists`) come first */
  @property({ attribute: false }) manifest?: NostrPostManifest;
  @property({ type: Object }) messages: Partial<ListMessages> = {};
  /** Which lists: bookmarks (default) or e.g. calendars (`CALENDAR_LISTS`) */
  @property({ attribute: false }) listKind: ListKind = BOOKMARK_LISTS;

  @state() _open = false;
  @state() _my: MyListsState = NOT_LOADED;
  /** Address of the list being published, or 'new' */
  @state() _busy = '';
  @state() _error = '';
  @state() _newTitle = '';

  get _m(): ListMessages {
    return { ...DEFAULT_LIST_MESSAGES, ...this.messages };
  }

  get _item() {
    return itemFor(this.target, this.relay);
  }

  get _lists(): BookmarkList[] {
    // A manifest's `lists` are bookmark sets
    const presets = this.listKind === BOOKMARK_LISTS ? manifestListPresets(this.manifest) : [];
    return shownLists(this._my, presets, this.listKind);
  }

  override updated(changed: Map<string, unknown>): void {
    // Another target: whether it's saved is unknown until the lists are checked again
    if (changed.has('target') && changed.get('target') !== undefined) {
      this._loads++;
      this._my = NOT_LOADED;
      if (this._open) void this._load();
    }
  }

  async _toggleOpen(): Promise<void> {
    this._open = !this._open;
    if (this._open && !this._my.lists && !this._my.waitingForSigner) await this._load();
  }

  /** Counts loads, so one replaced by a newer load (a retry, another target) is ignored */
  _loads = 0;

  _load(): Promise<void> {
    const load = ++this._loads;
    return loadMyLists(
      this.relays,
      this._m,
      (patch) => {
        if (load === this._loads) this._my = { ...this._my, ...patch };
      },
      undefined,
      this.listKind
    );
  }

  _published(list: BookmarkList): void {
    const lists = this._my.lists ?? [];
    this._my = {
      ...this._my,
      lists: lists.some((l) => l.address === list.address)
        ? lists.map((l) => (l.address === list.address ? list : l))
        : [...lists, list],
    };
    this.dispatchEvent(
      new CustomEvent('np-list-change', { detail: { list }, bubbles: true, composed: true })
    );
  }

  async _toggle(list: BookmarkList): Promise<void> {
    this._busy = list.address;
    this._error = '';
    const options = { relays: this.relays, listKind: this.listKind };
    const result = hasItem(list, this._item)
      ? await removeFromList(list, this._item, options)
      : await addToList(list, this._item, options);
    this._busy = '';
    if (result.success) this._published(result.data);
    else this._error = this._m.failed(result.error.message);
  }

  async _create(e: Event): Promise<void> {
    e.preventDefault();
    const title = this._newTitle.trim();
    if (!title) return;
    // A list with that title already: save to it instead of making a second one
    const existing = listWithTitle(this._lists, title, (l) => listTitle(l, this._m));
    if (existing) {
      this._newTitle = '';
      if (!hasItem(existing, this._item)) await this._toggle(existing);
      return;
    }
    this._busy = 'new';
    this._error = '';
    const result = await createList(
      { title, items: [this._item] },
      { relays: this.relays, listKind: this.listKind }
    );
    this._busy = '';
    if (result.success) {
      this._newTitle = '';
      this._published(result.data);
    } else {
      this._error = this._m.failed(result.error.message);
    }
  }

  _renderPanel() {
    const m = this._m;
    const item = this._item;
    const lists = this._lists;
    const titles = listTitles(lists, m);
    return html`
      <div class="panel" role="dialog" aria-label=${m.save}>
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
        ${lists.map(
          (list) => html`
            <label class="list-option">
              <input
                type="checkbox"
                .checked=${hasItem(list, item)}
                ?disabled=${this._busy !== '' || !this._my.lists}
                @change=${() => this._toggle(list)}
              />
              <span>${titles.get(list.address)}</span>
              <span class="count">${m.itemCount(list.items.length)}</span>
            </label>
          `
        )}
        ${renderLoadState(this._my, m, () => void this._load())}
        ${
          this._my.lists
            ? html`<form class="new-list" @submit=${this._create}>
                <input
                  .value=${this._newTitle}
                  placeholder=${m.newListPlaceholder}
                  aria-label=${m.newListPlaceholder}
                  @input=${(e: Event) => {
                    this._newTitle = (e.target as HTMLInputElement).value;
                  }}
                />
                <button type="submit" ?disabled=${this._busy !== '' || !this._newTitle.trim()}>
                  ${this._busy === 'new' ? m.creating : m.createList}
                </button>
              </form>`
            : nothing
        }
        <div class="actions">
          <button type="button" @click=${this._toggleOpen}>${m.close}</button>
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.target) return nothing;
    const saved = (this._my.lists ?? []).some((list) => hasItem(list, this._item));
    return html`
      <button
        type="button"
        class="save-btn"
        aria-pressed=${saved ? 'true' : 'false'}
        aria-expanded=${this._open ? 'true' : 'false'}
        @click=${this._toggleOpen}
      >
        ${saved ? `★ ${this._m.saved}` : `☆ ${this._m.save}`}
      </button>
      ${this._open ? this._renderPanel() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-list-save': NpListSave;
  }
}
