/**
 * @nostr-post/cdn - calendar: NIP-52 calendars (<nostr-calendar-agenda>, <nostr-calendar-event>,
 * RSVP, Add to calendar, iCalendar).
 */

import '@nostr-post/calendar/web';

// Calendars (NIP-52): <nostr-calendar-agenda>, RSVP, calendars, duplicates, iCalendar
export {
  type AgendaWindow,
  agendaFilter,
  agendaFilters,
  agendaSummary,
  agendaText,
  agendaWindowFor,
  answersByAddress,
  CALENDAR_EVENT_MANIFEST,
  calendarEventFilters,
  eventDates,
  eventTimeZone,
  eventTiming,
  fetchCalendarItems,
  fetchEventsAsIcs,
  fetchIcsRefs,
  fetchRsvps,
  fetchRsvpsBy,
  formatMonth,
  fromSource,
  groupEventsByDay,
  importedFilter,
  monthGrid,
  monthWindow,
  publishRsvp,
  type RsvpStatus,
  rsvpEvent,
  rsvpsByFilter,
  shiftMonth,
  shiftWindow,
  similarEvents,
  summarizeRsvps,
  titleSimilarity,
  windowDates,
} from '@nostr-post/calendar';
export { eventsToIcs, type IcsDraft, icsDTag, icsToDrafts } from '@nostr-post/calendar/ics';
export { agendaImage, drawAgendaImage } from '@nostr-post/calendar/web';
