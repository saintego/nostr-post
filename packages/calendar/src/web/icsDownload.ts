/**
 * @nostr-post/plugin-date - <np-ics-download>
 *
 * Downloads a calendar event as an `.ics` file, for calendar apps. An event action of
 * calendar manifests, next to RSVP. Accepts .target (the event's address) and .relays.
 */

import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fetchEventsAsIcs } from '../icsRelays';
import { isCalendarEventAddress } from '../rsvp';
import { DEFAULT_ICS_MESSAGES, type IcsMessages } from './icsMessages';
import { rsvpStyles } from './rsvpStyles';

@customElement('np-ics-download')
export class NpIcsDownload extends LitElement {
  static override styles = rsvpStyles;

  @property() target = '';
  @property({ type: Array }) relays?: string[];
  @property({ type: Object }) messages: Partial<IcsMessages> = {};

  @state() _busy = false;
  @state() _error = '';

  get _m(): IcsMessages {
    return { ...DEFAULT_ICS_MESSAGES, ...this.messages };
  }

  async _download(): Promise<void> {
    this._busy = true;
    this._error = '';
    try {
      const ics = await fetchEventsAsIcs([this.target], { relays: this.relays });
      if (!ics.includes('BEGIN:VEVENT')) throw new Error(this._m.notFound);
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.target.split(':').slice(2).join(':') || 'event'}.ics`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this._error = this._m.failed(error instanceof Error ? error.message : String(error));
    } finally {
      this._busy = false;
    }
  }

  override render() {
    if (!isCalendarEventAddress(this.target)) return nothing;
    const m = this._m;
    return html`
      <button type="button" title=${m.title} ?disabled=${this._busy} @click=${this._download}>
        ${this._busy ? m.preparing : m.download}
      </button>
      ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-ics-download': NpIcsDownload;
  }
}
