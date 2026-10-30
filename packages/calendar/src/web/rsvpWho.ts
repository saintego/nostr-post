/**
 * The "who answered" panel of <np-rsvp>: the people of each answer, with avatars and names
 * (plugin-profile's <np-profile-view>).
 */

import '@nostr-post/plugin-profile/web';
import { html, nothing, type TemplateResult } from 'lit';
import { peopleByStatus, RSVP_STATUSES, type RsvpSummary } from '../rsvp';
import type { RsvpMessages } from './rsvpMessages';

export const renderRsvpWho = (
  summary: RsvpSummary | undefined,
  m: RsvpMessages
): TemplateResult => {
  const people = peopleByStatus(summary);
  const groups = RSVP_STATUSES.filter((status) => people[status].length > 0);
  return html`
    <div class="who" role="dialog" aria-label=${m.label}>
      ${groups.length === 0 ? html`<div class="note">${m.noAnswers}</div>` : nothing}
      ${groups.map(
        (status) => html`
          <div class="who-group">
            <div class="who-title">${m[status]} · ${people[status].length}</div>
            <np-profile-view .value=${people[status].map((pubkey) => ({ pubkey }))}></np-profile-view>
          </div>
        `
      )}
    </div>
  `;
};
