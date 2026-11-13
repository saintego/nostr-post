/**
 * Template parts of <np-venue-input> for a pasted Google Maps short link: the place's name when
 * the link came without its share text, and Google's matches to pick from (shown only for
 * picking; only the picked place's id is kept)
 */

import { html, nothing } from 'lit';
import type { GooglePlace } from '../googlePlaces';
import type { VenueInputMessages } from './venueMessages';

/** "Name of the place" and Find, for a short link without its share text */
export const renderShortLinkName = (m: VenueInputMessages, onFind: (name: string) => void) => {
  const find = (form: HTMLFormElement) => {
    const name = new FormData(form).get('name');
    if (typeof name === 'string' && name.trim()) onFind(name.trim());
  };
  return html`<form
    class="search-row short-name"
    @submit=${(e: SubmitEvent) => {
      e.preventDefault();
      find(e.target as HTMLFormElement);
    }}
  >
    <input
      class="search-input np-input"
      part="input"
      name="name"
      placeholder=${m.googleShortNamePlaceholder}
      aria-label=${m.googleShortNamePlaceholder}
    />
    <button class="np-button" part="button" type="submit">${m.googleShortFind}</button>
  </form>`;
};

/** Google's matches for a short link, to pick the place */
export const renderGooglePlaces = (
  places: GooglePlace[],
  m: VenueInputMessages,
  onPick: (place: GooglePlace) => void
) =>
  places.length
    ? html`<div class="results" role="listbox" aria-label=${m.googleShortPick}>
        ${places.map(
          (place) => html`<div
            class="result-item"
            role="option"
            tabindex="0"
            @click=${() => onPick(place)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') onPick(place);
            }}
          >
            ${place.name ?? place.id}
            ${place.address ? html`<div class="result-type">${place.address}</div>` : nothing}
          </div>`
        )}
      </div>`
    : nothing;
