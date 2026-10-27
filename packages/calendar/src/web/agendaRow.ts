/**
 * A compact agenda row: time, title, place and topics of one event on one day (`agendaItem`).
 * The title opens the event: in place (its full view, with comments and actions) or, with an
 * `eventHref`, on the app's event page.
 */

import { html, nothing, type TemplateResult } from 'lit';
import type { AgendaItem } from '../agendaItem';
import type { AgendaMessages } from './agendaMessages';

export interface AgendaRowOptions {
  open: boolean;
  /** The app's page of an event, e.g. `#/event/<naddr>`; without it the title opens in place */
  eventHref?: (address: string) => string;
  onToggle: () => void;
  messages: AgendaMessages;
}

export const renderAgendaRow = (item: AgendaItem, options: AgendaRowOptions): TemplateResult => {
  const { messages: m } = options;
  const when = item.allDay ? m.allDay : item.continued ? m.continued : (item.time ?? '');
  const title = options.eventHref
    ? html`<a class="agenda-title" href=${options.eventHref(item.address)}>${item.title}</a>`
    : html`<button
        type="button"
        class="agenda-title"
        aria-expanded=${options.open ? 'true' : 'false'}
        @click=${options.onToggle}
      >
        ${item.title}
      </button>`;
  return html`
    <div class="agenda-row ${options.open ? 'open' : ''}">
      <span class="agenda-time">${when}</span>
      <span class="agenda-main">
        ${title}
        ${item.place ? html`<span class="agenda-place">${item.place}</span>` : nothing}
      </span>
      ${
        item.topics.length > 0
          ? html`<span class="agenda-topics">${item.topics.map((t) => html`<span>#${t}</span>`)}</span>`
          : nothing
      }
      ${
        options.eventHref
          ? html`<button type="button" class="agenda-more" aria-expanded=${options.open ? 'true' : 'false'} @click=${options.onToggle}>
              ${options.open ? m.close : m.details}
            </button>`
          : nothing
      }
    </div>
  `;
};
