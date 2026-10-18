/**
 * @nostr-post/plugin-list - <np-list-input>, the list field's input
 *
 * The signed-in user's lists to tick, with the lists to save to first (`lists` of the
 * entity manifest of `metadata.saveField`, or of the post's manifest), and new lists by
 * title. Nothing is published here: the field's afterPublish hook saves once the post is
 * out. Value: list addresses, and `new:<title>` for lists to create.
 */

import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type ListPreset, listWithTitle } from '../core';
import { choiceValue, fieldPresets, type ListChoice, listChoices } from '../listField';
import { listTitle, listTitles } from '../listTitles';
import { loadMyLists, type MyListsState, NOT_LOADED, shownLists } from '../myLists';
import type { BookmarkList } from '../types';
import { DEFAULT_LIST_MESSAGES, type ListMessages } from './listMessages';
import { renderLoadState } from './loadState';
import { listStyles } from './styles';

@customElement('np-list-input')
export class NpListInput extends LitElement {
  static override styles = listStyles;

  @property({ attribute: false }) value: unknown = null;
  @property({ attribute: false }) field: PostField | null = null;
  /** The post's manifest (set by the composers), to find `metadata.saveField` */
  @property({ attribute: false }) manifest?: NostrPostManifest;
  /** The author, when the composer knows it: then the signer isn't asked */
  @property({ attribute: false }) pubkey?: string;
  @property({ type: Object }) messages: Partial<ListMessages> = {};

  @state() _my: MyListsState = NOT_LOADED;
  @state() _presets: ListPreset[] = [];
  @state() _newTitle = '';

  get _m(): ListMessages {
    return { ...DEFAULT_LIST_MESSAGES, ...this.messages };
  }

  get _choices(): ListChoice[] {
    return listChoices(this.value);
  }

  override updated(changed: Map<string, unknown>): void {
    // Once the field and manifest are set: the lists for the saved field's type
    if (changed.has('field') || changed.has('manifest')) {
      void fieldPresets(this.field, this.manifest).then((presets) => {
        this._presets = presets;
      });
    }
  }

  override firstUpdated(): void {
    // After the first render, so the composer has set `pubkey` (and field, manifest)
    void this._load();
  }

  override willUpdate(changed: Map<string, unknown>): void {
    // The composer learned the pubkey while the signer was still being asked
    if (
      changed.has('pubkey') &&
      this.pubkey &&
      this.pubkey !== this._my.pubkey &&
      this.hasUpdated
    ) {
      void this._load();
    }
  }

  _load(): Promise<void> {
    const relays = this.field?.metadata?.relays as string[] | undefined;
    return loadMyLists(
      relays,
      this._m,
      (patch) => {
        this._my = { ...this._my, ...patch };
      },
      this.pubkey
    );
  }

  _emit(choices: ListChoice[]): void {
    this.value = choices.length > 0 ? choices.map(choiceValue) : null;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  _toggle(list: BookmarkList, on: boolean): void {
    const others = this._choices.filter((c) => c.address !== list.address);
    // A preset not published yet gets its title when it's created (saveToChoices)
    this._emit(on ? [...others, { address: list.address }] : others);
  }

  _addNew(e: Event): void {
    e.preventDefault();
    const title = this._newTitle.trim();
    if (!title || this._choices.some((c) => !c.address && c.title === title)) return;
    this._newTitle = '';
    // A list with that title already: tick it instead of making a second one
    const existing = listWithTitle(shownLists(this._my, this._presets), title, (l) =>
      listTitle(l, this._m)
    );
    if (existing) {
      if (!this._choices.some((c) => c.address === existing.address)) this._toggle(existing, true);
      return;
    }
    this._emit([...this._choices, { title }]);
  }

  override render() {
    const m = this._m;
    const chosen = new Set(this._choices.map((c) => c.address));
    const newOnes = this._choices.filter((c) => !c.address && c.title);
    const lists = shownLists(this._my, this._presets);
    const titles = listTitles(lists, m);
    return html`
      ${lists.map(
        (list) => html`<label class="list-option">
          <input
            type="checkbox"
            .checked=${chosen.has(list.address)}
            @change=${(e: Event) => this._toggle(list, (e.target as HTMLInputElement).checked)}
          />
          <span>${titles.get(list.address)}</span>
          <span class="count">${m.itemCount(list.items.length)}</span>
        </label>`
      )}
      ${newOnes.map(
        (choice) => html`<label class="list-option">
          <input
            type="checkbox"
            checked
            @change=${() => this._emit(this._choices.filter((c) => c.title !== choice.title || c.address))}
          />
          <span>${m.newListChoice(choice.title ?? '')}</span>
        </label>`
      )}
      ${renderLoadState(this._my, m, () => void this._load())}
      <form class="new-list" @submit=${this._addNew}>
        <input
          .value=${this._newTitle}
          placeholder=${m.newListPlaceholder}
          aria-label=${m.newListPlaceholder}
          @input=${(e: Event) => {
            this._newTitle = (e.target as HTMLInputElement).value;
          }}
        />
        <button type="submit" ?disabled=${!this._newTitle.trim()}>${m.addNewList}</button>
      </form>
      <div class="muted">${m.fieldHint}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-list-input': NpListInput;
  }
}
