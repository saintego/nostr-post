/**
 * @nostr-post/calendar - Core entrypoint
 *
 * NIP-52 calendars without UI: the calendar event manifest, agenda and month windows, RSVPs
 * (31925), calendars (31924), duplicate checks. iCalendar is '@nostr-post/calendar/ics';
 * the elements are '@nostr-post/calendar/web'. The date field itself is @nostr-post/plugin-date.
 */
export {
  type AgendaDay,
  type AgendaWindow,
  agendaDayTags,
  agendaFilter,
  type CalendarEventLike,
  DEFAULT_AGENDA_DAYS,
  type EventTiming,
  eventDates,
  eventTiming,
  formatAgendaDate,
  formatWindowRange,
  groupEventsByDay,
  latestByAddress,
  shiftWindow,
  todayIn,
  windowDates,
} from './agenda';
export { type AgendaItem, agendaItem } from './agendaItem';
export { AGENDA_LIMIT, type AgendaQuery, agendaFilters } from './agendaQuery';
export { CALENDAR_EVENT_MANIFEST } from './calendarManifest';
export {
  calendarEventFilters,
  fetchCalendarItems,
  publishesCalendarEvents,
} from './calendars';
export { fetchEventsAsIcs } from './icsRelays';
export {
  agendaWindowFor,
  formatMonth,
  monthGrid,
  monthOf,
  monthWindow,
  shiftMonth,
  weekdayNames,
  weekStartOf,
} from './month';
export {
  isCalendarEventAddress,
  peopleByStatus,
  RSVP_KIND,
  RSVP_STATUSES,
  type RsvpLike,
  type RsvpStatus,
  type RsvpSummary,
  rsvpEvent,
  rsvpFilter,
  summarizeRsvps,
  type UnsignedRsvp,
  withAnswer,
} from './rsvp';
export { fetchRsvps, publishRsvp, type RsvpRelayOptions } from './rsvpRelays';
export {
  type EventDraft,
  type SimilarEvent,
  similarEvents,
  titleSimilarity,
} from './similar';
