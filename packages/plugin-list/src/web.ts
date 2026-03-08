/**
 * @nostr-post/plugin-list - <np-list-input>
 *
 * Web component for selecting and managing NIP-51 user lists.
 * Provides:
 * - Single or multi list selection dropdown
 * - Create new list dialog
 * - Delete list confirmation
 * - Add/remove pubkeys from selected list
 *
 * Value: string | string[] (list ID or list IDs)
 * Dispatches 'np-value-changed' with { detail: { value: string | string[] | null } }
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import type { PostField } from '@nostr-post/plugins/types';
import {
  DEFAULT_RELAYS,
  type SignedEvent,
  fetchEvents,
  getPublicKey,
  hasNostrSigner,
  publishToRelays,
  signEvent,
} from '@nostr-post/signer';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { listPlugin, loadUserLists, publishNewList } from './core';
import type { ListPluginConfig, Nip51Adapter, UserList } from './types';
import { listInputStyles } from './web/styles';

@customElement('np-list-input')
export class NpListInput extends LitElement {
  static styles = listInputStyles;

  @property({ type: Object })
  value: string | string[] | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  @state() private lists: UserList[] = [];
  @state() private isLoading = false;
  @state() private loadError: string | null = null;
  @state() private showCreateDialog = false;
  @state() private newListName = '';
  @state() private newListDescription = '';
  @state() private isCreating = false;

  private get signerAdapter(): Nip51Adapter {
    return {
      queryEvents: (filter, relays) => fetchEvents(filter, relays),
      signEvent: (event) => signEvent(event),
      publishEvent: (event, relays) => publishToRelays(event as SignedEvent, relays),
    };
  }

  private get config(): ListPluginConfig {
    return (this.field?.metadata ?? {}) as ListPluginConfig;
  }

  private get isMultiple(): boolean {
    return this.config.multiple !== false;
  }

  private get selectedListIds(): string[] {
    if (!this.value) return [];
    if (typeof this.value === 'string') return this.value ? [this.value] : [];
    if (Array.isArray(this.value)) {
      return this.value.filter((id): id is string => typeof id === 'string' && id.length > 0);
    }
    return [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.loadLists();
  }

  private async loadLists(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    try {
      if (!hasNostrSigner()) {
        this.loadError = 'No Nostr signer found. Install/use NIP-07 (Alby, nos2x, etc.).';
        this.lists = [];
        return;
      }
      const pubkey = await getPublicKey();
      const relays = this.config.relays ?? DEFAULT_RELAYS;
      this.lists = await loadUserLists(pubkey, relays, this.signerAdapter);
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to load lists';
      this.lists = [];
    } finally {
      this.isLoading = false;
    }
  }

  private onListSelect(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const listIds = this.isMultiple
      ? Array.from(select.selectedOptions)
          .map((option) => (option as HTMLOptionElement).value)
          .filter((id) => id.length > 0)
      : select.value
        ? [select.value]
        : [];

    if (listIds.length === 0) {
      this.value = null;
      this.emitValue(null);
      return;
    }

    this.value = this.isMultiple ? listIds : (listIds[0] ?? null);
    this.emitValue(this.value);
  }

  private openCreateDialog(): void {
    if (!this.config.allowCreate) return;
    this.showCreateDialog = true;
  }

  private closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.newListName = '';
    this.newListDescription = '';
  }

  private async createList(): Promise<void> {
    if (!this.newListName.trim()) {
      this.loadError = 'List name is required';
      return;
    }
    this.isCreating = true;
    try {
      if (!hasNostrSigner()) throw new Error('No Nostr signer found. Cannot create list.');
      const pubkey = await getPublicKey();
      const relays = this.config.relays ?? DEFAULT_RELAYS;
      const newList = await publishNewList(
        { pubkey, name: this.newListName, description: this.newListDescription },
        relays,
        this.signerAdapter
      );
      const newListId = newList.id ?? this.newListName;
      this.lists = [newList, ...this.lists];
      const listIds = Array.from(new Set([...this.selectedListIds, newListId]));
      this.value = this.isMultiple ? listIds : (listIds[0] ?? null);
      this.emitValue(this.value);
      this.closeCreateDialog();
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to create list';
    } finally {
      this.isCreating = false;
    }
  }

  private async deleteList(listId: string): Promise<void> {
    if (!this.config.allowDelete || !confirm('Delete this list? This cannot be undone.')) {
      return;
    }

    try {
      // TODO: Delete list event from relays
      this.lists = this.lists.filter((l) => l.id !== listId);
      const remainingListIds = this.selectedListIds.filter((id) => id !== listId);
      this.value =
        remainingListIds.length > 0
          ? this.isMultiple
            ? remainingListIds
            : remainingListIds[0]
          : null;
      this.emitValue(this.value);
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to delete list';
      console.error('Error deleting list:', err);
    }
  }

  private emitValue(value: string | string[] | null): void {
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const selectedListIdSet = new Set(this.selectedListIds);
    const selectedLists = this.lists.filter((list) => list.id && selectedListIdSet.has(list.id));

    return html`
      <div class="container">
        ${this.loadError ? html`<div class="error">❌ ${this.loadError}</div>` : nothing}

        <div class="selection-row">
          <select @change=${this.onListSelect} ?disabled=${this.isLoading} ?multiple=${this.isMultiple}>
            ${this.isMultiple ? nothing : html`<option value="">Select a list…</option>`}
            ${this.lists.map(
              (list) =>
                html`<option value=${list.id || ''} ?selected=${selectedListIdSet.has(list.id || '')}>${list.name}</option>`
            )}
          </select>
          ${
            this.config.allowCreate
              ? html`<button class="btn" @click=${this.openCreateDialog} ?disabled=${this.isLoading}>
                  ➕ Create
                </button>`
              : nothing
          }
          ${
            selectedLists.length === 1 && this.config.allowDelete
              ? html`<button
                  class="btn btn-danger"
                  @click=${() => {
                    const selectedId = selectedLists[0].id;
                    if (selectedId) this.deleteList(selectedId);
                  }}
                >
                  🗑️
                </button>`
              : nothing
          }
        </div>

        ${
          this.isMultiple
            ? html`<div class="loading">Hold Ctrl/Cmd to select multiple lists.</div>`
            : nothing
        }

        ${this.isLoading ? html`<div class="loading">Loading lists…</div>` : nothing}

        ${selectedLists.map(
          (selectedList) => html`
            <div class="list-info">
              <div class="list-name">${selectedList.name}</div>
              ${
                selectedList.description
                  ? html`<div class="list-description">${selectedList.description}</div>`
                  : nothing
              }
              <div class="list-stats">${selectedList.pubkeys.length} members</div>
              ${
                this.config.allowDelete && selectedList.id
                  ? html`<button
                      class="btn btn-danger"
                      @click=${() => {
                        const selectedId = selectedList.id;
                        if (selectedId) this.deleteList(selectedId);
                      }}
                    >
                      Delete this list
                    </button>`
                  : nothing
              }
            </div>
          `
        )}

        ${
          this.showCreateDialog
            ? html`
                <div class="dialog-overlay" @click=${this.closeCreateDialog}>
                  <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
                    <div class="dialog-title">Create New List</div>

                    <div class="dialog-field">
                      <label>List Name</label>
                      <input
                        type="text"
                        .value=${this.newListName}
                        @input=${(e: Event) => {
                          this.newListName = (e.target as HTMLInputElement).value;
                        }}
                        placeholder="e.g., Trusted Reviewers"
                      />
                    </div>

                    <div class="dialog-field">
                      <label>Description</label>
                      <textarea
                        .value=${this.newListDescription}
                        @input=${(e: Event) => {
                          this.newListDescription = (e.target as HTMLTextAreaElement).value;
                        }}
                        placeholder="Optional description of this list"
                        rows="3"
                      ></textarea>
                    </div>

                    <div class="dialog-actions">
                      <button @click=${this.closeCreateDialog} ?disabled=${this.isCreating}>
                        Cancel
                      </button>
                      <button class="primary" @click=${this.createList} ?disabled=${this.isCreating}>
                        ${this.isCreating ? 'Creating…' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              `
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-list-input': NpListInput;
  }
}

// Register plugin with its web input tag name so composer renders np-list-input
pluginRegistry.register({
  ...listPlugin,
  inputTagName: 'np-list-input',
});

export { listPlugin } from './core';
