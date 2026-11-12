/**
 * @nostr-post/web - <nostr-post-menu>
 *
 * A post's "⋯" menu: copy the author's npub, the post's naddr or nevent (with the relays it was
 * found on) and its JSON, or open the raw-data panel (`rawEventData`, `@nostr-post/posts`).
 * <nostr-post-view> shows it in every post's header; `hide-menu` there turns it off. A post in
 * the test-mode log also gets "Publish for real", which opens <nostr-dry-run-publish>.
 */

import type { DisplayableEvent } from '@nostr-post/core/types';
import { type RawEventData, rawEventData } from '@nostr-post/posts';
import { DRY_RUN_CHANGE_EVENT, getDryRunEntries, type SignedEvent } from '@nostr-post/signer';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '@nostr-post/ui/web/dialog';
import type { NpDialog } from '@nostr-post/ui/web/dialog';
import './dryRunPublish';
import type { DryRunPublishMessages } from './dryRunPublishMessages';
import { DEFAULT_POST_MENU_MESSAGES, type PostMenuMessages } from './postMenuMessages';
import { type CopyTarget, copyText, renderMenuItems, renderRawPanel } from './postMenuPanel';
import { postMenuStyles } from './postMenuStyles';

@customElement('nostr-post-menu')
export class NostrPostMenu extends NpElement {
  static override styles = [...npStyles, postMenuStyles];

  @property({ attribute: false }) event?: SignedEvent;
  /** Where the event was found; default: the relays this session fetched it from */
  @property({ type: Array, attribute: false }) relays?: string[];
  /** Overrides of DEFAULT_POST_MENU_MESSAGES (e.g. translations) */
  @property({ type: Object, attribute: false }) messages: Partial<PostMenuMessages> = {};
  /** Overrides of the "Publish for real" panel's messages */
  @property({ type: Object, attribute: false })
  publishMessages: Partial<DryRunPublishMessages> = {};

  @state() _open = false;
  @state() _copied?: { target: CopyTarget; ok: boolean };
  /** Whether the post is in the test-mode log */
  @state() _logged = false;
  /** The "Publish for real" dialog is open: its panel is made fresh each time */
  @state() _publishOpen = false;
  @query('np-dialog.raw-dialog') _dialog?: NpDialog;
  @query('np-dialog.publish-dialog') _publishDialog?: NpDialog;

  _onDryRunChange = () => {
    const id = this.event?.id;
    this._logged = !!id && getDryRunEntries().some((e) => e.event.id === id);
  };

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('event')) this._onDryRunChange();
  }

  /** Closes the menu on a click outside it */
  _onDocumentClick = (event: MouseEvent) => {
    if (!event.composedPath().includes(this)) this._open = false;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this._onDocumentClick);
    window.addEventListener(DRY_RUN_CHANGE_EVENT, this._onDryRunChange);
  }

  override disconnectedCallback(): void {
    document.removeEventListener('click', this._onDocumentClick);
    window.removeEventListener(DRY_RUN_CHANGE_EVENT, this._onDryRunChange);
    super.disconnectedCallback();
  }

  get _messages(): PostMenuMessages {
    return { ...DEFAULT_POST_MENU_MESSAGES, ...this.messages };
  }

  _raw(event: SignedEvent): RawEventData {
    return rawEventData(event, this.relays);
  }

  async _copy(target: CopyTarget): Promise<void> {
    if (!this.event) return;
    const ok = await navigator.clipboard
      ?.writeText(copyText(this._raw(this.event), target))
      .then(() => true)
      .catch(() => false);
    this._copied = { target, ok: ok ?? false };
    setTimeout(() => {
      if (this._copied?.target === target) this._copied = undefined;
    }, 1500);
  }

  _showRaw(): void {
    this._open = false;
    this._dialog?.showModal();
  }

  override render() {
    if (!this.event) return nothing;
    const m = this._messages;
    const raw = this._raw(this.event);
    return html`
      <button
        type="button"
        class="np-icon-button"
        part="button"
        aria-label=${m.menu}
        title=${m.menu}
        aria-haspopup="menu"
        aria-expanded=${this._open ? 'true' : 'false'}
        @click=${() => {
          this._open = !this._open;
        }}
      >
        ⋯
      </button>
      ${
        this._open
          ? renderMenuItems({
              raw,
              messages: m,
              copied: this._copied,
              onCopy: (target) => void this._copy(target),
              onRaw: () => this._showRaw(),
              onPublish: this._logged
                ? () => {
                    this._open = false;
                    this._publishOpen = true;
                    this._publishDialog?.showModal();
                  }
                : undefined,
            })
          : nothing
      }
      <np-dialog
        class="publish-dialog"
        exportparts="dialog, header, button"
        heading=${m.publishForReal}
        .messages=${{ close: m.close }}
        @close=${() => {
          this._publishOpen = false;
        }}
      >
        ${
          this._publishOpen
            ? html`<nostr-dry-run-publish
                event-id=${this.event.id}
                .messages=${this.publishMessages}
              ></nostr-dry-run-publish>`
            : nothing
        }
      </np-dialog>
      <np-dialog
        class="raw-dialog"
        exportparts="dialog, header, button"
        heading=${m.rawData}
        .messages=${{ close: m.close }}
      >
        ${renderRawPanel(raw, m, (target) => void this._copy(target))}
      </np-dialog>
    `;
  }
}

/** A post's menu, for a signed event (a preview has no id or signature yet) */
export const renderPostMenu = (
  event: DisplayableEvent,
  messages: Partial<PostMenuMessages> = {}
) =>
  typeof event.id === 'string' && typeof event.sig === 'string'
    ? html`<nostr-post-menu .event=${event as SignedEvent} .messages=${messages}></nostr-post-menu>`
    : nothing;

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-menu': NostrPostMenu;
  }
}
