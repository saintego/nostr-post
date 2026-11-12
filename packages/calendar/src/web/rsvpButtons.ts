/**
 * @nostr-post/plugin-date - <np-rsvp>
 *
 * Going / Maybe / Can't go on a calendar event, with how many people answered each and the
 * signed-in user's own answer marked (`knownPublicKey`; "Loading answers…" until loaded). An event
 * action (`registerEventAction`): views show it with events made with calendar manifests.
 * Accepts .target (the event's address) and .relays; reading needs no signer, answering does.
 */

import { knownPublicKey, onKnownPublicKeyChange } from '@nostr-post/signer';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  isCalendarEventAddress,
  RSVP_STATUSES,
  type RsvpStatus,
  type RsvpSummary,
  summarizeRsvps,
  withAnswer,
} from '../rsvp';
import { fetchRsvps, publishRsvp } from '../rsvpRelays';
import { DEFAULT_RSVP_MESSAGES, type RsvpMessages } from './rsvpMessages';
import { rsvpStyles } from './rsvpStyles';
import { renderRsvpWho } from './rsvpWho';

@customElement('np-rsvp')
export class NpRsvp extends NpElement {
  static override styles = [...npStyles, rsvpStyles];

  /** The calendar event's address, `kind:pubkey:d` */
  @property() target = '';
  /** Relays besides the user's own */
  @property({ type: Array }) relays?: string[];
  @property({ type: Object }) messages: Partial<RsvpMessages> = {};

  @state() _summary?: RsvpSummary;
  /** The user's answer given here (shown before the next load has it) */
  @state() _answered?: RsvpStatus;
  /** The signed-in user, as far as the app knows (`knownPublicKey`): their answer is marked */
  @state() _me = knownPublicKey();
  @state() _busy = false;
  @state() _error = '';
  @state() _whoOpen = false;

  /** Counts loads, so one replaced by a newer load (another target) is ignored */
  _loads = 0;
  _unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this._me = knownPublicKey();
    this._unsubscribe = onKnownPublicKeyChange((pubkey) => {
      this._me = pubkey;
      this._answered = undefined;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe?.();
  }

  /** The user's answer: given here, else theirs among the loaded ones */
  get _mine(): RsvpStatus | undefined {
    return this._answered ?? (this._me ? this._summary?.byPubkey.get(this._me) : undefined);
  }

  get _m(): RsvpMessages {
    return { ...DEFAULT_RSVP_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('target')) void this._load();
  }

  async _load(): Promise<void> {
    const load = ++this._loads;
    this._summary = undefined;
    this._answered = undefined;
    if (!isCalendarEventAddress(this.target)) return;
    const target = this.target;
    const events = await fetchRsvps([target], { relays: this.relays }).catch(() => []);
    if (load === this._loads) this._summary = summarizeRsvps(events, target);
  }

  async _answer(status: RsvpStatus): Promise<void> {
    this._busy = true;
    this._error = '';
    const result = await publishRsvp(this.target, status, { relays: this.relays });
    this._busy = false;
    if (!result.success) {
      this._error = this._m.failed(result.error.message);
      return;
    }
    this._answered = status;
    this._summary = withAnswer(this._summary, result.data.pubkey, status);
  }

  override render() {
    if (!isCalendarEventAddress(this.target)) return nothing;
    const m = this._m;
    const mine = this._mine;
    const counts = this._summary?.counts;
    const answers = counts ? counts.accepted + counts.tentative + counts.declined : 0;
    return html`
      <div class="rsvp" part="actions" role="group" aria-label=${m.label}>
        ${RSVP_STATUSES.map(
          (status) => html`
            <button
              type="button"
              class="np-chip ${status === mine ? 'np-selected' : ''}"
              part="chip"
              aria-pressed=${status === mine ? 'true' : 'false'}
              ?disabled=${this._busy}
              @click=${() => this._answer(status)}
            >
              ${m[status]}${counts ? html` <span class="count">${counts[status]}</span>` : ''}
            </button>
          `
        )}
        ${
          answers > 0
            ? html`<button
                type="button"
                class="who-button np-chip"
                part="chip"
                aria-expanded=${this._whoOpen ? 'true' : 'false'}
                @click=${() => {
                  this._whoOpen = !this._whoOpen;
                }}
              >
                ${m.who(answers)}
              </button>`
            : ''
        }
        ${this._busy ? html`<span class="np-hint">${m.saving}</span>` : ''}
        ${
          !this._busy && !this._summary
            ? html`<span class="np-hint" role="status">${m.loading}</span>`
            : ''
        }
      </div>
      ${this._whoOpen ? renderRsvpWho(this._summary, m) : ''}
      ${this._error ? html`<p class="error np-field-error" part="error" role="alert">${this._error}</p>` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-rsvp': NpRsvp;
  }
}
