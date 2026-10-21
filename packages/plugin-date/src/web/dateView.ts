/**
 * @nostr-post/plugin-date - <np-date-view>
 *
 * Read-only date display in the viewer's locale, with the time zone of timed values.
 * Accepts .value (DateValue) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formatDateValue } from '../core';
import { type DateValue, hasTime, isDateValue } from '../dateValue';

@customElement('np-date-view')
export class NpDateView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .date {
      padding: 0.25rem 0;
    }

    .tz {
      margin-left: 0.375rem;
      font-size: 0.8125rem;
      color: #6b7280;
    }
  `;

  @property({ type: Object }) value?: DateValue;
  @property({ type: Object }) field?: PostField;

  render() {
    if (!isDateValue(this.value)) return html``;
    const { tzid, start } = this.value;
    return html`<div class="date">
      ${formatDateValue(this.value)}${
        hasTime(start) && tzid ? html`<span class="tz">${tzid}</span>` : ''
      }
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-date-view': NpDateView;
  }
}
