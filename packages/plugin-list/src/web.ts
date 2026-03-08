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
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { createListEvent, fetchUserLists, listPlugin, parseListEvent } from './core';
import type { ListPluginConfig, UserList } from './types';

@customElement('np-list-input')
export class NpListInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Selection row */
    .selection-row {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
    }

    select {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }

    select:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    :host-context(.dark) select {
      background: #374151;
      border-color: #4b5563;
      color: #f3f4f6;
    }

    :host-context(.dark) select:focus {
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    .btn {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #f9fafb;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .btn:hover {
      background: #f3f4f6;
    }

    :host-context(.dark) .btn {
      background: #374151;
      border-color: #4b5563;
      color: #f3f4f6;
    }

    :host-context(.dark) .btn:hover {
      background: #4b5563;
    }

    .btn:active {
      background: #e5e7eb;
    }

    .btn-danger {
      color: #ef4444;
      border-color: #fecaca;
    }

    .btn-danger:hover {
      background: #fef2f2;
    }

    :host-context(.dark) .btn-danger {
      color: #fca5a5;
      border-color: #7f1d1d;
    }

    :host-context(.dark) .btn-danger:hover {
      background: #450a0a;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* List info card */
    .list-info {
      padding: 0.75rem;
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-size: 0.8125rem;
      line-height: 1.5;
    }

    .list-name {
      font-weight: 600;
      color: #0c4a6e;
      margin-bottom: 0.25rem;
    }

    .list-description {
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .list-stats {
      color: #475569;
      font-size: 0.75rem;
    }

    :host-context(.dark) .list-info {
      background: #1e293b;
      border-color: #334155;
    }

    :host-context(.dark) .list-name {
      color: #bfdbfe;
    }

    :host-context(.dark) .list-description {
      color: #cbd5e1;
    }

    :host-context(.dark) .list-stats {
      color: #94a3b8;
    }

    /* Create list dialog */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    :host-context(.dark) .dialog-overlay {
      background: rgba(0, 0, 0, 0.7);
    }

    .dialog {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    :host-context(.dark) .dialog {
      background: #1f2937;
      color: #f3f4f6;
      border: 1px solid #374151;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
    }

    .dialog-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .dialog-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .dialog-field label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .dialog-field input,
    .dialog-field textarea {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .dialog-field input:focus,
    .dialog-field textarea:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    :host-context(.dark) .dialog-field label {
      color: #e5e7eb;
    }

    :host-context(.dark) .dialog-field input,
    :host-context(.dark) .dialog-field textarea {
      background: #374151;
      border-color: #4b5563;
      color: #f3f4f6;
    }

    :host-context(.dark) .dialog-field input::placeholder,
    :host-context(.dark) .dialog-field textarea::placeholder {
      color: #9ca3af;
    }

    :host-context(.dark) .dialog-field input:focus,
    :host-context(.dark) .dialog-field textarea:focus {
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    .dialog-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .dialog-actions button {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      background: #f9fafb;
    }

    .dialog-actions button:hover {
      background: #f3f4f6;
    }

    :host-context(.dark) .dialog-actions button {
      background: #374151;
      border-color: #4b5563;
      color: #f3f4f6;
    }

    :host-context(.dark) .dialog-actions button:hover {
      background: #4b5563;
    }

    .dialog-actions button.primary {
      background: #6366f1;
      color: white;
      border-color: #6366f1;
    }

    .dialog-actions button.primary:hover {
      background: #4f46e5;
    }

    /* Loading & error states */
    .loading {
      color: #6b7280;
      font-size: 0.8125rem;
      padding: 0.5rem 0;
    }

    :host-context(.dark) .loading {
      color: #9ca3af;
    }

    .error {
      color: #dc2626;
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
    }

    :host-context(.dark) .error {
      color: #fca5a5;
      background: #450a0a;
      border-color: #7f1d1d;
    }
  `;

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
      // Get user's relays from signer (if available)
      // For now, use defaults or config relays
      const relays = this.config.relays || [
        'wss://relay.damus.io',
        'wss://relay.snort.social',
        'wss://nos.lol',
      ];

      // TODO: Get actual user pubkey from Nostr context
      const userPubkey = 'placeholder-pubkey'; // Replace with actual
      this.lists = await fetchUserLists(userPubkey, relays);
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to load lists';
      console.error('Error loading lists:', err);
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
      // Create unsigned event
      const event = createListEvent(
        'placeholder-pubkey',
        this.newListName,
        [],
        30000,
        this.newListDescription
      );

      // TODO: Sign and publish the event using Nostr signer context
      // For now, just add to local list
      const newList = parseListEvent(event);
      if (newList) {
        const newListId = newList.id || this.newListName;
        this.lists = [...this.lists, newList];
        const listIds = Array.from(new Set([...this.selectedListIds, newListId]));
        this.value = this.isMultiple ? listIds : (listIds[0] ?? null);
        this.emitValue(this.value);
        this.closeCreateDialog();
      }
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to create list';
      console.error('Error creating list:', err);
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
