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
  groupEventsByDay,
  latestByAddress,
  todayIn,
  windowDates,
} from './agenda';
export {
  type DatePrecision,
  type DateValue,
  dayNumbers,
  defaultTimeZone,
  isDateValue,
  isValidTimeZone,
  MAX_DAY_TAGS,
  unixToWall,
  valueTimeZone,
  wallForPrecision,
  wallToUnix,
} from './dateValue';
