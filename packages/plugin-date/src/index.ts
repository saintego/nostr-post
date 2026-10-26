/**
 * @nostr-post/plugin-date - Core entrypoint
 *
 * Import this for headless usage (validation, serialization, NIP-52 date tags).
 * Import '@nostr-post/plugin-date/web' for the input and view components.
 * Calendar events themselves (agenda, RSVP, calendars, iCalendar) are @nostr-post/calendar.
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
export {
  type DatePrecision,
  type DateValue,
  dateOfDayNumber,
  dayNumberOfDate,
  dayNumbers,
  defaultTimeZone,
  isDateValue,
  isValidTimeZone,
  MAX_DAY_TAGS,
  timeZones,
  unixToWall,
  valueTimeZone,
  wallForPrecision,
  wallToUnix,
} from './dateValue';
