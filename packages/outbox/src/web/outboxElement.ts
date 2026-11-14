/**
 * @nostr-post/outbox/web - <nostr-post-outbox>: the queue
 *
 * Each item with its thumbnail, title, state, size to upload, how long it has waited, its
 * time (timed posts), the reason it failed, and its actions: Upload now, Send now, Retry, Cancel
 * (a running upload or publish),
 * Edit (drafts: fires `outbox-edit` with the item, for the app to open its composer), Remove;
 * and "Send all now". Default: the browser outbox (`browserOutbox`) and the signer's pubkey.
 */

import { getPublicKey } from '@nostr-post/signer';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  isInterrupted,
  isLate,
  itemActions,
  nowSeconds,
  type OutboxAction,
  type OutboxItem,
  type OutboxState,
  pendingBytes,
  waitingFor,
} from '../item';
import type { Outbox } from '../outbox';
import { DEFAULT_OUTBOX_MESSAGES, type OutboxMessages } from './outboxMessages';
import { outboxStyles } from './outboxStyles';
import { browserOutbox, connectionConditions, ensureOutboxRunner } from './runner';

/** Items waiting this long get the warning that browsers may clear them */
const OLD_SECONDS = 4 * 86400;

/** Badge tone of each state */
const STATE_TONE: Record<OutboxState, string> = {
  draft: '',
  waiting: 'np-warning',
  uploading: 'np-info',
  publishing: 'np-info',
  published: 'np-success',
  failed: 'np-error',
};

@customElement('nostr-post-outbox')
export class NostrPostOutbox extends NpElement {
  static override styles = [...npStyles, outboxStyles];

  /** The outbox; default the browser's */
  @property({ attribute: false }) outbox?: Outbox;
  /** Whose items; default the signer's pubkey */
  @property() pubkey?: string;
  /** Overrides of DEFAULT_OUTBOX_MESSAGES (e.g. translations) */
  @property({ type: Object, attribute: false }) messages: Partial<OutboxMessages> = {};

  @state() _items: OutboxItem[] = [];
  /** Object URLs of thumbnails by file key */
  @state() _thumbs = new Map<string, string>();
  _unsubscribe?: () => void;
  _owner?: string;
  /** Signing in (nostr-login) or coming back to the page: the user's items may differ */
  _reload = () => void this._load();

  get _box(): Outbox {
    return this.outbox ?? browserOutbox();
  }

  get _m(): OutboxMessages {
    return { ...DEFAULT_OUTBOX_MESSAGES, ...this.messages };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe = this._box.subscribe(() => void this._load());
    document.addEventListener('nlAuth', this._reload);
    window.addEventListener('focus', this._reload);
    if (!this.outbox) ensureOutboxRunner();
    void this._load();
  }

  override disconnectedCallback(): void {
    this._unsubscribe?.();
    document.removeEventListener('nlAuth', this._reload);
    window.removeEventListener('focus', this._reload);
    for (const url of this._thumbs.values()) URL.revokeObjectURL(url);
    this._thumbs = new Map();
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('pubkey') || changed.has('outbox')) {
      if (changed.has('outbox') && changed.get('outbox') !== undefined) {
        this._unsubscribe?.();
        this._unsubscribe = this._box.subscribe(() => void this._load());
      }
      void this._load();
    }
  }

  async _load(): Promise<void> {
    this._owner = this.pubkey ?? (await getPublicKey().catch(() => undefined));
    this._items = this._owner ? await this._box.list(this._owner) : [];
    for (const item of this._items) {
      const image = item.uploads.find((u) => u.type.startsWith('image/'));
      if (!image || this._thumbs.has(image.fileKey)) continue;
      const file = await this._box.file(image.fileKey);
      if (file) this._thumbs = new Map(this._thumbs).set(image.fileKey, URL.createObjectURL(file));
    }
  }

  _act(item: OutboxItem, action: OutboxAction): void {
    if (action === 'remove') void this._box.remove(item.id);
    else if (action === 'cancel') void this._box.cancel(item.id);
    else if (action === 'edit') {
      this.dispatchEvent(
        new CustomEvent('outbox-edit', { detail: item, bubbles: true, composed: true })
      );
    } else void this._box.run(item.id, { ...connectionConditions(), force: true });
  }

  _sendAll(): void {
    if (this._owner) void this._box.runAll(this._owner, { ...connectionConditions(), force: true });
  }

  _meta(item: OutboxItem, now: number) {
    const m = this._m;
    const parts: string[] = [isInterrupted(item, now) ? m.interrupted : m.states[item.state]];
    const bytes = pendingBytes(item);
    if (bytes > 0) parts.push(m.size(bytes));
    if (item.sendAt !== undefined) parts.push(m.sendAt(new Date(item.sendAt * 1000)));
    else if (item.state !== 'draft') parts.push(m.waited(waitingFor(item, now)));
    if (bytes > 0 && item.wifiOnly && item.state === 'waiting') parts.push(m.onWifi);
    if (item.signLater && item.events.length === 0) parts.push(m.signLater);
    const [state, ...rest] = parts;
    return html`<div class="meta">
      <span class="np-badge ${STATE_TONE[item.state]}" part="badge">${state}</span>
      ${rest.join(' · ')}
      ${isLate(item, now) ? html` · <span class="late">${m.late}</span>` : nothing}
    </div>`;
  }

  _row(item: OutboxItem, now: number) {
    const m = this._m;
    const image = item.uploads.find((u) => u.type.startsWith('image/'));
    const thumb = image ? this._thumbs.get(image.fileKey) : undefined;
    return html`<li class="np-list-item" part="card">
      ${thumb ? html`<img class="thumb" part="media" src=${thumb} alt="" />` : nothing}
      <div class="body">
        <div class="title">${item.title || m.untitled}</div>
        ${this._meta(item, now)}
        ${item.error ? html`<div class="np-field-error" part="error">${item.error}</div>` : nothing}
        <div class="actions np-toolbar" part="actions">
          ${itemActions(item, now).map(
            (action) => html`<button
              type="button"
              class="np-button np-small ${action === 'remove' ? 'np-danger np-text' : ''}"
              part="button"
              @click=${() => this._act(item, action)}
            >
              ${m.actions[action]}
            </button>`
          )}
        </div>
      </div>
    </li>`;
  }

  override render() {
    const m = this._m;
    const now = nowSeconds();
    const canSend = this._items.some((i) => i.state === 'waiting' || i.state === 'failed');
    const old = this._items.some((i) => waitingFor(i, now) > OLD_SECONDS);
    return html`
      <div class="head" part="header">
        <h3 class="np-title" part="title">${m.heading}</h3>
        ${
          canSend
            ? html`<button
                type="button"
                class="np-button np-filled np-small"
                part="button primary"
                @click=${() => this._sendAll()}
              >
                ${m.sendAll}
              </button>`
            : nothing
        }
      </div>
      ${
        this._items.length === 0
          ? html`<div class="empty np-empty">${m.empty}</div>`
          : html`<ul class="np-list">${this._items.map((item) => this._row(item, now))}</ul>`
      }
      ${old ? html`<p class="np-message np-warning">${m.oldWarning}</p>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-outbox': NostrPostOutbox;
  }
}
