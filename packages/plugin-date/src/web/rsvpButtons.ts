/**
 * @nostr-post/plugin-date - <np-rsvp>
 *
 * Going / Maybe / Can't go on a calendar event, with how many people answered each. An event
 * action (`registerEventAction`): views show it with events made with calendar manifests.
 * Accepts .target (the event's address) and .relays; reading needs no signer, answering does.
 */

import { html, LitElement, nothing } from 'lit';
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

@customElement('np-rsvp')
export class NpRsvp extends LitElement {
  static override styles = rsvpStyles;

  /** The calendar event's address, `kind:pubkey:d` */
  @property() target = '';
  /** Relays besides the user's own */
  @property({ type: Array }) relays?: string[];
  @property({ type: Object }) messages: Partial<RsvpMessages> = {};

  @state() _summary?: RsvpSummary;
  /** The user's answer, once they gave one here */
  @state() _mine?: RsvpStatus;
  @state() _busy = false;
  @state() _error = '';

  /** Counts loads, so one replaced by a newer load (another target) is ignored */
  _loads = 0;

  get _m(): RsvpMessages {
    return { ...DEFAULT_RSVP_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('target')) void this._load();
  }

  async _load(): Promise<void> {
    const load = ++this._loads;
    this._summary = undefined;
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
    this._mine = status;
    this._summary = withAnswer(this._summary, result.data.pubkey, status);
  }

  override render() {
    if (!isCalendarEventAddress(this.target)) return nothing;
    const m = this._m;
    const counts = this._summary?.counts;
    return html`
      <div class="rsvp" role="group" aria-label=${m.label}>
        ${RSVP_STATUSES.map(
          (status) => html`
            <button
              type="button"
              class=${status === this._mine ? 'chosen' : ''}
              aria-pressed=${status === this._mine ? 'true' : 'false'}
              ?disabled=${this._busy}
              @click=${() => this._answer(status)}
            >
              ${m[status]}${counts ? html` <span class="count">${counts[status]}</span>` : ''}
            </button>
          `
        )}
        ${this._busy ? html`<span class="note">${m.saving}</span>` : ''}
      </div>
      ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-rsvp': NpRsvp;
  }
}
