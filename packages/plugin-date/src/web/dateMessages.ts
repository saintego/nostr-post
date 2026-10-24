/**
 * User-facing text of <np-date-input> and <np-date-view>. Apps can override any of it
 * with the components' `messages` property (e.g. for translations).
 */
export interface DateMessages {
  start: string;
  end: string;
  /** Button that shows the end input */
  addEnd: string;
  removeEnd: string;
  timeZone: string;
  /** Shown while the end is before the start */
  endBeforeStart: string;
  /** Shown while the time zone isn't one the browser knows; the typed zone follows */
  unknownTimeZone: (tzid: string) => string;
}

export const DEFAULT_DATE_MESSAGES: DateMessages = {
  start: 'Start',
  end: 'End',
  addEnd: 'Add end',
  removeEnd: 'Remove end',
  timeZone: 'Time zone',
  endBeforeStart: 'The end is before the start',
  unknownTimeZone: (tzid) => `Unknown time zone: ${tzid}. Pick one from the list`,
};
