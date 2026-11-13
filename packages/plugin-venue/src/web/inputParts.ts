/** Template parts of <np-venue-input>: OpenStreetMap's search results and the picked venue's card */

import { html, nothing } from 'lit';
import { type NominatimResult, osmUrl, type VenueData } from '../core';
import { resultLevel, type VenueLevel } from '../levels';
import type { VenueInputMessages } from './venueMessages';

/** OpenStreetMap's matches, with their level when the field offers several */
export const renderOsmResults = (
  results: NominatimResult[],
  levels: VenueLevel[],
  m: VenueInputMessages,
  onSelect: (result: NominatimResult) => void
) =>
  html`<div class="results">
    ${results.map(
      (r) => html`
        <div class="result-item" @click=${() => onSelect(r)}>
          ${r.display_name}
          <div class="result-type">
            ${levels.length > 1 ? `${m.levelLabel[resultLevel(r)]} · ` : ''}${r.class}/${r.type} ·
            ${r.osm_type}:${r.osm_id}
          </div>
        </div>
      `
    )}
  </div>`;

/** The picked venue: its name, OSM link and Clear */
export const renderVenueCard = (v: VenueData, m: VenueInputMessages, onClear: () => void) => html`
  <div class="venue-card">
    ${v.name ? html`<div class="venue-name">📍 ${v.name}</div>` : nothing}
    <div class="venue-meta">
      ${
        v.osmType && v.osmId
          ? html`<a href="${osmUrl(v.osmType, v.osmId)}" target="_blank" rel="noopener">
              OSM ${v.osmType}:${v.osmId} ↗
            </a>`
          : nothing
      }
    </div>
    <button class="np-button np-text np-small np-danger" part="button" @click=${onClear}>
      ${m.clearVenue}
    </button>
  </div>
`;
