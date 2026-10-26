/**
 * @nostr-post/list - <np-list-view>
 *
 * Shows a list (`address`: `30003:<pubkey>:<d-tag>` or `10003:<pubkey>:`), or without it
 * the signed-in user's lists, with the title of each item. The owner can remove items
 * and delete sets.
 *
 * Dispatches 'np-list-item-select' with { detail: { item, list, title } } when an item is
 * clicked (the app decides what opening it means), and 'np-list-change' with
 * { detail: { list, deleted? } } after a list was published or deleted.
 */

import { getPublicKey, hasNostrSigner } from '@nostr-post/signer';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fetchItemTitles } from '../itemTitles';
import { deleteList, fetchLists, fetchMyLists, removeFromList } from '../lists';
import { listTitle, listTitles } from '../listTitles';
import { BOOKMARK_SET_KIND, type BookmarkList, type ListItem } from '../types';
import { DEFAULT_LIST_MESSAGES, type ListMessages } from './listMessages';
import { listStyles } from './styles';

@customElement('np-list-view')
export class NpListView extends LitElement {
  static override styles = listStyles;

  /** The list to show; empty: the signed-in user's lists */
  @property() address = '';
  /** Relays besides the list owner's own */
  @property({ type: Array }) relays?: string[];
  @property({ type: Object }) messages: Partial<ListMessages> = {};

  @state() _lists: BookmarkList[] | null = null;
  @state() _titles = new Map<string, string>();
  @state() _me = '';
  @state() _busy = false;
  @state() _error = '';

  get _m(): ListMessages {
    return { ...DEFAULT_LIST_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('address') || changed.has('relays')) void this._load();
  }

  async _load(): Promise<void> {
    this._lists = null;
    this._error = '';
    const options = { relays: this.relays };
    try {
      this._me = hasNostrSigner() ? await getPublicKey().catch(() => '') : '';
      const owner = this.address.split(':')[1];
      if (!this.address && !this._me) {
        this._error = this._m.noSigner;
        return;
      }
      const lists = owner ? await fetchLists(owner, options) : await fetchMyLists(options);
      this._lists = this.address ? lists.filter((l) => l.address === this.address) : lists;
      this._titles = await fetchItemTitles(
        this._lists.flatMap((l) => l.items),
        this.relays
      );
    } catch (error) {
      this._error = this._m.failed(error instanceof Error ? error.message : String(error));
    }
  }

  _changed(list: BookmarkList, deleted = false): void {
    this._lists = (this._lists ?? []).flatMap((l) =>
      l.address !== list.address ? [l] : deleted ? [] : [list]
    );
    this.dispatchEvent(
      new CustomEvent('np-list-change', {
        detail: deleted ? { list, deleted } : { list },
        bubbles: true,
        composed: true,
      })
    );
  }

  async _remove(list: BookmarkList, item: ListItem): Promise<void> {
    this._busy = true;
    const result = await removeFromList(list, item, { relays: this.relays });
    this._busy = false;
    if (result.success) this._changed(result.data);
    else this._error = this._m.failed(result.error.message);
  }

  async _delete(list: BookmarkList): Promise<void> {
    if (!confirm(this._m.confirmDelete(listTitle(list, this._m)))) return;
    this._busy = true;
    const result = await deleteList(list, { relays: this.relays });
    this._busy = false;
    if (result.success) this._changed(list, true);
    else this._error = this._m.failed(result.error.message);
  }

  _select(list: BookmarkList, item: ListItem, title: string): void {
    this.dispatchEvent(
      new CustomEvent('np-list-item-select', {
        detail: { item, list, title },
        bubbles: true,
        composed: true,
      })
    );
  }

  _renderList(list: BookmarkList) {
    const m = this._m;
    const own = list.pubkey === this._me;
    return html`
      <section class="list">
        <div class="list-header">
          <h3>${listTitles(this._lists ?? [], m).get(list.address) ?? listTitle(list, m)}</h3>
          <span class="count">${m.itemCount(list.items.length)}</span>
          ${
            own && list.kind === BOOKMARK_SET_KIND
              ? html`<button class="danger" ?disabled=${this._busy} @click=${() => this._delete(list)}>
                  ${m.deleteList}
                </button>`
              : nothing
          }
        </div>
        ${list.description ? html`<p class="list-description">${list.description}</p>` : nothing}
        ${
          list.items.length === 0
            ? html`<div class="muted">${m.emptyList}</div>`
            : html`<ul>
                ${list.items.map((item) => {
                  const title = this._titles.get(item.value) ?? m.unknownItem(item.value);
                  return html`<li>
                    <button class="item-title" @click=${() => this._select(list, item, title)}>
                      ${title}
                    </button>
                    ${
                      own
                        ? html`<button ?disabled=${this._busy} @click=${() => this._remove(list, item)}>
                            ${m.remove}
                          </button>`
                        : nothing
                    }
                  </li>`;
                })}
              </ul>`
        }
      </section>
    `;
  }

  override render() {
    const m = this._m;
    if (this._error && !this._lists) return html`<div class="error">${this._error}</div>`;
    if (!this._lists) return html`<div class="muted">${m.loading}</div>`;
    // The bookmarks list is always there; with nothing in it and no sets, say so instead
    const shown = this._lists.filter((l) => l.items.length > 0 || l.createdAt > 0);
    return html`
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      ${shown.length === 0 ? html`<div class="muted">${m.noLists}</div>` : shown.map((l) => this._renderList(l))}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-list-view': NpListView;
  }
}
