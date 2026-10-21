/**
 * @nostr-post/plugin-date - <np-date-input>
 *
 * Date input: a date, or a date and time with a time zone, depending on the field's
 * precision (on calendar events: the kind of the selected publish format, `.activeKinds`).
 * Accepts .value (DateValue), .field (PostField) and .activeKinds.
 * Dispatches 'np-value-changed' with { detail: { value: DateValue | undefined } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { datePrecision } from '../core';
import { type DateValue, defaultTimeZone, wallForPrecision } from '../dateValue';
import { type DateMessages, DEFAULT_DATE_MESSAGES } from './dateMessages';

@customElement('np-date-input')
export class NpDateInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 0.5rem 0.75rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: #6b7280;
    }

    input {
      font: inherit;
      font-size: 0.875rem;
      padding: 0.375rem 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
    }

    .tz {
      width: 12rem;
    }

    button {
      font: inherit;
      font-size: 0.8125rem;
      background: none;
      border: none;
      color: #6366f1;
      cursor: pointer;
      padding: 0.375rem 0;
    }
  `;

  @property({ type: Object }) value?: DateValue;
  @property({ type: Object }) field?: PostField;
  /** Kinds of the composer's selected publish format */
  @property({ type: Array }) activeKinds?: number[];
  @property({ type: Object }) messages: Partial<DateMessages> = {};

  @state() private _endShown = false;

  private get _m(): DateMessages {
    return { ...DEFAULT_DATE_MESSAGES, ...this.messages };
  }

  private _emit(value: DateValue | undefined) {
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  private _update(changes: Partial<DateValue>, timed: boolean) {
    const next: DateValue = { ...(this.value ?? { start: '' }), ...changes };
    if (timed && !next.tzid) next.tzid = defaultTimeZone();
    if (!next.end) delete next.end;
    this._emit(next.start ? next : undefined);
  }

  private _removeEnd() {
    this._endShown = false;
    if (!this.value?.end) return;
    const { end: _end, ...rest } = this.value;
    this._emit(rest);
  }

  render() {
    const timed = this.field ? datePrecision(this.field, this.activeKinds) === 'time' : false;
    const precision = timed ? 'time' : 'day';
    const type = timed ? 'datetime-local' : 'date';
    const shown = (wall?: string) => (wall ? wallForPrecision(wall, precision) : '');
    const m = this._m;
    const endShown = this._endShown || Boolean(this.value?.end);
    const onDate = (key: 'start' | 'end') => (e: Event) =>
      this._update({ [key]: (e.target as HTMLInputElement).value }, timed);

    return html`
      <div class="row">
        <label>
          ${m.start}
          <input type=${type} .value=${shown(this.value?.start)} @change=${onDate('start')} />
        </label>
        ${
          endShown
            ? html`
              <label>
                ${m.end}
                <input type=${type} .value=${shown(this.value?.end)} @change=${onDate('end')} />
              </label>
              <button type="button" @click=${this._removeEnd}>${m.removeEnd}</button>
            `
            : html`<button type="button" @click=${() => {
                this._endShown = true;
              }}>${m.addEnd}</button>`
        }
        ${
          timed
            ? html`
              <label>
                ${m.timeZone}
                <input
                  class="tz"
                  type="text"
                  .value=${this.value?.tzid ?? defaultTimeZone()}
                  @change=${(e: Event) =>
                    this._update({ tzid: (e.target as HTMLInputElement).value.trim() }, timed)}
                />
              </label>
            `
            : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-date-input': NpDateInput;
  }
}
