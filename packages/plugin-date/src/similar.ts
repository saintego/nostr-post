/**
 * @nostr-post/plugin-date - Finding an event that already exists
 *
 * Before publishing a new calendar event: the events that take place on one of its days with a
 * similar title, so the user can RSVP to that one instead. Ask relays with `agendaFilter` for
 * the days (and `#g` for the area); this ranks what comes back. No DOM dependencies.
 */

import { textWords } from '@nostr-post/core/textNormalize';
import { type CalendarEventLike, eventDates, eventTiming, latestByAddress } from './agenda';
import { type DateValue, dateOfDayNumber, dayNumberOfDate, defaultTimeZone } from './dateValue';

/** What's known of the event being created: its title and date (the date field's value) */
export interface EventDraft {
  title: string;
  when: DateValue;
}

export interface SimilarEvent<T> {
  event: T;
  /** 0–1: how alike the titles are (shared words) */
  score: number;
}

/** A title's words (core's `textWords`) without short and common ones */
const titleWords = (title: string): Set<string> =>
  new Set(textWords(title).filter((word) => word.length > 2 && !STOP_WORDS.has(word)));

const STOP_WORDS = new Set(['the', 'and', 'with', 'live', 'presents', 'feat', 'los', 'las', 'del']);

/** How alike two titles are: shared words over the words of the shorter title */
export const titleSimilarity = (a: string, b: string): number => {
  const left = titleWords(a);
  const right = titleWords(b);
  const smaller = Math.min(left.size, right.size);
  if (smaller === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  return shared / smaller;
};

/** The calendar dates of a draft's date value (start to end, `YYYY-MM-DD`) */
const draftDates = (when: DateValue): Set<string> => {
  const first = dayNumberOfDate(when.start.slice(0, 10));
  if (first === undefined) return new Set();
  const last = when.end ? (dayNumberOfDate(when.end.slice(0, 10)) ?? first) : first;
  const dates = new Set<string>();
  for (let day = first; day <= Math.max(first, last) && dates.size < 31; day++) {
    dates.add(dateOfDayNumber(day));
  }
  return dates;
};

/**
 * Events sharing a day with the draft whose titles are at least `minScore` alike, most alike
 * first; one version per event
 */
export const similarEvents = <T extends CalendarEventLike>(
  draft: EventDraft,
  events: T[],
  options: { tzid?: string; minScore?: number } = {}
): SimilarEvent<T>[] => {
  const days = draftDates(draft.when);
  const tzid = options.tzid ?? draft.when.tzid ?? defaultTimeZone();
  const minScore = options.minScore ?? 0.5;
  return latestByAddress(events)
    .flatMap((event) => {
      const timing = eventTiming(event);
      if (!timing || !eventDates(timing, tzid).some((date) => days.has(date))) return [];
      const title = event.tags.find((tag) => tag[0] === 'title')?.[1] ?? '';
      const score = titleSimilarity(draft.title, title);
      return score >= minScore ? [{ event, score }] : [];
    })
    .sort((a, b) => b.score - a.score);
};
