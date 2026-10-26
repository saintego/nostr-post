/**
 * @nostr-post/plugin-date - Core entrypoint
 *
 * Import this for headless usage (validation, serialization, NIP-52 tags).
 * Import '@nostr-post/plugin-date/web' for the input and view components.
 */
export {
  ALL_DAY_EVENT_KIND,
  calendarExtraTags,
  datePlugin,
  datePrecision,
  dateValueFromTags,
  formatDateValue,
  TIMED_EVENT_KIND,
} from './core';
export { CALENDAR_EVENT_MANIFEST } from './calendarManifest';
export {
  draftFormatId,
  draftKind,
  eventsToIcs,
  type IcsDraft,
  type IcsEventSource,
  icsDTag,
  icsToDrafts,
} from './ics';
export { fetchEventsAsIcs } from './icsRelays';
export {
  type EventDraft,
  type SimilarEvent,
  similarEvents,
  titleSimilarity,
} from './similar';
export {
  calendarEventFilters,
  fetchCalendarItems,
  publishesCalendarEvents,
} from './calendars';
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
export {
  formatMonth,
  monthGrid,
  monthOf,
  monthWindow,
  shiftMonth,
  weekdayNames,
  weekStartOf,
} from './month';
export {
  type DatePrecision,
  type DateValue,
  dayNumbers,
  defaultTimeZone,
  isDateValue,
  isValidTimeZone,
  timeZones,
  MAX_DAY_TAGS,
  unixToWall,
  valueTimeZone,
  wallForPrecision,
  wallToUnix,
} from './dateValue';
