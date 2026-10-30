/**
 * @nostr-post/calendar/web
 *
 * Importing this module defines the calendar's elements and plugs them into the views
 * (`@nostr-post/plugins/entities`):
 * - <nostr-calendar-agenda>: events of a date window or a month, by day
 * - <nostr-calendar-event>: one event by address, also the kind view of 31922/31923: a post
 *   linking an event shows it
 * - event actions on events made with calendar manifests: RSVP (<np-rsvp>), Add to calendar
 *   (<np-calendar-save>), `.ics` (<np-ics-download>)
 */

import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from '@nostr-post/plugin-date';
import { registerEventAction, registerKindView } from '@nostr-post/plugins/entities';
import { publishesCalendarEvents } from './calendars';

import './web/agenda';
import './web/calendarEvent';
import './web/rsvpButtons';
import './web/calendarSave';
import './web/icsDownload';

registerKindView({
  kinds: [ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND],
  tagName: 'nostr-calendar-event',
});
registerEventAction({ tagName: 'np-rsvp', matches: publishesCalendarEvents });
registerEventAction({ tagName: 'np-calendar-save', matches: publishesCalendarEvents });
registerEventAction({ tagName: 'np-ics-download', matches: publishesCalendarEvents });

export { NostrCalendarAgenda } from './web/agenda';
export { NostrCalendarDays } from './web/agendaDays';
export { type AgendaImageOptions, agendaImage, drawAgendaImage } from './web/agendaImage';
export { type AgendaMessages, DEFAULT_AGENDA_MESSAGES } from './web/agendaMessages';
export { NostrCalendarEvent } from './web/calendarEvent';
export { NpCalendarSave } from './web/calendarSave';
export { DEFAULT_CALENDAR_SAVE_MESSAGES } from './web/calendarMessages';
export { NpIcsDownload } from './web/icsDownload';
export { DEFAULT_ICS_MESSAGES, type IcsMessages } from './web/icsMessages';
export { NpRsvp } from './web/rsvpButtons';
export { DEFAULT_RSVP_MESSAGES, type RsvpMessages } from './web/rsvpMessages';
