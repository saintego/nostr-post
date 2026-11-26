/**
 * @nostr-post/web - <nostr-post-support>
 *
 * How to support a person or project: their support page (`SUPPORT_MANIFEST`, one addressable
 * event, `@nostr-post/posts`) with each entry shown by its plugin: Lightning (zaps, invoices),
 * tip links and Bitcoin addresses, and the intro. Read from relays by `npub` (or hex `pubkey`),
 * or given inline (`.page`, no requests). `recipients`: a NIP-51 list's address whose people are
 * shown too ("Also support"); nothing adds recipients on its own. The owner, when signed in, sees
 * Edit (or "Set up your support page"), which opens the composer in a dialog.
 */

import { decodeProfile } from '@nostr-post/core/nip19';
import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  fetchListRecipients,
  fetchSupportPage,
  SUPPORT_D_TAG,
  SUPPORT_MANIFEST,
  supportPageAddress,
  supportPageValues,
} from '@nostr-post/posts';
import {
  fetchProfile,
  knownPublicKey,
  type NostrProfile,
  onKnownPublicKeyChange,
} from '@nostr-post/signer';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import '@nostr-post/ui/web/dialog';
import type { NpDialog } from '@nostr-post/ui/web/dialog';
import { html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import './composer';
import { ensurePlugins, ensurePluginsForManifest } from './pluginAutoLoad';
import { DEFAULT_SUPPORT_MESSAGES, type SupportMessages } from './supportMessages';
import { hasEntries, renderEntries, renderHead, renderRecipients } from './supportParts';
import { supportStyles } from './supportStyles';

/** A pubkey from an npub, nprofile or hex key */
export const pubkeyOf = (value?: string): string | undefined => {
  const text = value?.trim().replace(/^nostr:/i, '');
  if (!text) return undefined;
  if (/^[0-9a-f]{64}$/.test(text)) return text;
  return decodeProfile(text)?.pubkey;
};

@customElement('nostr-post-support')
export class NostrPostSupport extends NpElement {
  static override styles = [...npStyles, supportStyles];

  /** Whose support page: an npub, nprofile or hex pubkey */
  @property() npub = '';
  /** Relays to read the page from (default: the person's relay list) */
  @property({ type: Array }) relays?: string[];
  /** The page's values inline (`intro`, `lightning`, `links`): shown without reading relays */
  @property({ attribute: false }) page?: Record<string, unknown>;
  /** Another support manifest, e.g. one extending `support-v1` with more entries */
  @property({ attribute: false }) manifest: NostrPostManifest = SUPPORT_MANIFEST;
  /** A NIP-51 list's address (`30000:<pubkey>:<d>`) whose people are shown too */
  @property() recipients?: string;
  /** In a private conversation: zaps warn that their receipt is public */
  @property({ type: Boolean, attribute: 'private-context' }) privateContext = false;
  /** Hide the heading (e.g. inside a dialog that has one) */
  @property({ type: Boolean, attribute: 'hide-heading' }) hideHeading = false;
  @property({ attribute: false }) messages: Partial<SupportMessages> = {};

  @state() _values?: Record<string, unknown>;
  @state() _loading = false;
  @state() _profile?: NostrProfile;
  @state() _listPeople: string[] = [];
  @state() _viewer = knownPublicKey();
  @state() _ready = false;

  @query('np-dialog') _editor?: NpDialog;
  _unsubscribe?: () => void;
  _loaded?: string;

  get _m(): SupportMessages {
    return { ...DEFAULT_SUPPORT_MESSAGES, ...this.messages };
  }

  get _owner(): string | undefined {
    return pubkeyOf(this.npub);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe = onKnownPublicKeyChange((pubkey) => {
      this._viewer = pubkey;
    });
    void ensurePluginsForManifest(this.manifest)
      .then(() => ensurePlugins(['lightning']))
      .then(() => {
        this._ready = true;
      });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe?.();
  }

  override willUpdate(changed: Map<string, unknown>): void {
    const key = `${this._owner ?? ''}|${this.recipients ?? ''}|${this.page ? 'inline' : ''}`;
    if (
      key === this._loaded ||
      !(changed.has('npub') || changed.has('recipients') || changed.has('page'))
    ) {
      return;
    }
    this._loaded = key;
    void this._load();
  }

  async _load(): Promise<void> {
    const owner = this._owner;
    if (this.recipients) {
      void fetchListRecipients(this.recipients, this.relays).then((people) => {
        this._listPeople = people;
      });
    }
    if (!owner) return;
    void fetchProfile(owner).then((profile) => {
      this._profile = profile;
    });
    if (this.page) {
      this._values = this.page;
      return;
    }
    this._loading = true;
    const event = await fetchSupportPage(owner, this.relays).catch(() => undefined);
    this._values = event ? supportPageValues(event, this.manifest) : {};
    this._loading = false;
  }

  _published(): void {
    this._editor?.close();
    this._loaded = undefined;
    // Relays may not have the new version yet: show what was just published meanwhile
    setTimeout(() => void this._load(), 1500);
  }

  _editorDialog() {
    const m = this._m;
    return html`<np-dialog heading=${m.editorHeading} backdrop-close>
      <nostr-post-composer
        .manifest=${this.manifest}
        d-tag=${SUPPORT_D_TAG}
        .prefill=${this._values ?? {}}
        .pubkey=${this._viewer}
        .messages=${{ submit: this._m.save }}
        hide-header
        auto-publish
        @nostr-post-published=${() => this._published()}
      ></nostr-post-composer>
    </np-dialog>`;
  }

  _body(values: Record<string, unknown>, editable: boolean) {
    const m = this._m;
    const owner = this._owner;
    if (this._loading || !this._ready) return html`<p class="np-hint">${m.loading}</p>`;
    if (!hasEntries(this.manifest, values)) {
      return editable ? nothing : html`<p class="np-empty">${m.empty}</p>`;
    }
    return renderEntries(this.manifest, values, {
      owner: owner ?? '',
      address: owner ? supportPageAddress(owner) : undefined,
      privateContext: this.privateContext,
    });
  }

  override render() {
    const m = this._m;
    const values = this._values ?? {};
    const owner = this._owner;
    // The owner edits a page read from relays (an inline page isn't theirs to publish)
    const editable = owner !== undefined && owner === this._viewer && !this.page;
    return html`<div class="support" part="card">
      ${renderHead({
        heading: this.hideHeading
          ? undefined
          : m.heading(this._profile?.display_name || this._profile?.name),
        edit: editable ? (hasEntries(this.manifest, values) ? 'edit' : 'create') : undefined,
        m,
        onEdit: () => this._editor?.showModal(),
      })}
      ${this._body(values, editable)}
      ${this._ready ? renderRecipients(this._listPeople, m, this.privateContext) : nothing}
      ${editable ? this._editorDialog() : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-support': NostrPostSupport;
  }
}
