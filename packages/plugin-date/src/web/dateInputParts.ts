/**
 * Template parts of <np-date-input>: the time zone picker and the messages under the inputs.
 */

import { html, type TemplateResult } from 'lit';
import { defaultTimeZone, timeZones } from '../dateValue';
import type { DateMessages } from './dateMessages';

/** A text input searchable through the zones the browser knows (a datalist) */
export const renderTimeZoneInput = (
  tzid: string | undefined,
  invalid: boolean,
  label: string,
  onChange: (tzid: string) => void
): TemplateResult => html`
  <label>
    ${label}
    <input
      class="tz"
      type="text"
      list="np-date-time-zones"
      autocomplete="off"
      aria-invalid=${invalid ? 'true' : 'false'}
      .value=${tzid ?? defaultTimeZone()}
      @focus=${(e: Event) => (e.target as HTMLInputElement).select()}
      @change=${(e: Event) => onChange((e.target as HTMLInputElement).value.trim())}
    />
    <datalist id="np-date-time-zones">
      ${timeZones().map((zone) => html`<option value=${zone}></option>`)}
    </datalist>
  </label>
`;

/**
 * The input's own messages: end before start, unknown time zone. None while the composer
 * shows its error for the field (`composerError`), so a problem isn't shown twice.
 */
export const renderDateProblems = (
  problems: { endTooEarly: boolean; unknownZone?: string },
  composerError: string | undefined,
  m: DateMessages
): TemplateResult[] => {
  if (composerError) return [];
  const texts = [
    problems.endTooEarly ? m.endBeforeStart : undefined,
    problems.unknownZone !== undefined ? m.unknownTimeZone(problems.unknownZone) : undefined,
  ];
  return texts.flatMap((text) => (text ? [html`<p class="error" role="alert">${text}</p>`] : []));
};
