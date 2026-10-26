/**
 * @nostr-post/plugin-date - iCalendar (.ics, RFC 5545)
 *
 * Calendar events to an `.ics` file (for calendar apps), and an `.ics` file to drafts of
 * calendar events (e.g. a Facebook events export). A draft's d-tag comes from the iCalendar UID
 * (`icsDTag`), so importing the same file again replaces its events instead of adding copies.
 * No DOM dependencies.
 */

import { type CalendarEventLike, eventTiming } from './agenda';
import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from './core';
import {
  type DateValue,
  dateOfDayNumber,
  dayNumberOfDate,
  defaultTimeZone,
  isValidTimeZone,
  unixToWall,
} from './dateValue';

/** A calendar event with what an `.ics` entry needs (a signed Nostr event fits) */
export interface IcsEventSource extends CalendarEventLike {
  content?: string;
}

/** A calendar event read from an `.ics` file, ready to prefill CALENDAR_EVENT_MANIFEST */
export interface IcsDraft {
  /** The iCalendar UID */
  uid: string;
  /** The Nostr d-tag for it, `ics:<UID>` */
  dTag: string;
  /** Whole days (kind 31922) or at a time (kind 31923) */
  allDay: boolean;
  /** Form data of CALENDAR_EVENT_MANIFEST: title, when, place, link, description */
  formData: Record<string, unknown>;
  /** `CLASS:PRIVATE` or `CONFIDENTIAL`: not for publishing */
  private: boolean;
}

/** The d-tag of an event imported from iCalendar: the same for every import of the same entry */
export const icsDTag = (uid: string): string => `ics:${uid.trim()}`;

// ── Writing ─────────────────────────────────────────────────────────

const escapeText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545 lines are at most 75 octets: longer ones continue on lines starting with a space */
const foldLine = (line: string): string => {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + charSize > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.join('\r\n ');
};

const compactDate = (date: string): string => date.replace(/-/g, '');

const utcStamp = (unix: number): string =>
  `${new Date(unix * 1000).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;

const tagValue = (tags: string[][], name: string): string | undefined =>
  tags.find((tag) => tag[0] === name)?.[1];

const eventAddress = (event: CalendarEventLike): string =>
  `${event.kind}:${event.pubkey}:${tagValue(event.tags, 'd') ?? ''}`;

/** The VEVENT lines of a calendar event; none without a valid start */
const veventLines = (event: IcsEventSource): string[] => {
  const timing = eventTiming(event);
  if (!timing) return [];
  const lines = ['BEGIN:VEVENT', `UID:${escapeText(eventAddress(event))}`];
  lines.push(`DTSTAMP:${utcStamp(event.created_at)}`);
  if (timing.allDay) {
    // iCalendar all-day ends are exclusive, like NIP-52's
    const lastDay = dayNumberOfDate(timing.lastDate ?? timing.start) ?? 0;
    lines.push(`DTSTART;VALUE=DATE:${compactDate(timing.start)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(dateOfDayNumber(lastDay + 1))}`);
  } else {
    // UTC times: valid everywhere without a VTIMEZONE block; calendar apps show local time
    lines.push(`DTSTART:${utcStamp(timing.startUnix)}`);
    if (timing.endUnix > timing.startUnix) lines.push(`DTEND:${utcStamp(timing.endUnix)}`);
  }
  const title = tagValue(event.tags, 'title') ?? tagValue(event.tags, 'name');
  if (title) lines.push(`SUMMARY:${escapeText(title)}`);
  const description = event.content?.trim() || tagValue(event.tags, 'summary');
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  const locations = event.tags.filter((t) => t[0] === 'location' && t[1]).map((t) => t[1] ?? '');
  if (locations.length > 0) lines.push(`LOCATION:${escapeText(locations.join(', '))}`);
  const link = tagValue(event.tags, 'r');
  if (link && /^https?:\/\//.test(link)) lines.push(`URL:${link}`);
  lines.push('END:VEVENT');
  return lines;
};

/** An `.ics` file with the calendar events (CRLF lines, folded at 75 octets) */
export const eventsToIcs = (events: IcsEventSource[], name?: string): string => {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nostr-post//plugin-date//EN'];
  if (name) lines.push(`X-WR-CALNAME:${escapeText(name)}`);
  for (const event of events) lines.push(...veventLines(event));
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
};

// ── Reading ─────────────────────────────────────────────────────────

interface IcsProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

const unescapeText = (text: string): string =>
  text.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

/** Unfolded content lines (a line starting with a space or tab continues the previous one) */
const unfold = (text: string): string[] =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .filter((line) => line.trim() !== '');

const parseProperty = (line: string): IcsProperty | undefined => {
  // The value starts after the first colon outside a quoted parameter value
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return undefined;
  const [name = '', ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const param of rawParams) {
    const [key = '', value = ''] = param.split('=');
    params[key.toUpperCase()] = value.replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
};

/** A DTSTART/DTEND: a calendar date, or wall time in a time zone */
type IcsDate = { date: string } | { wall: string; tzid: string };

const DATE_VALUE = /^(\d{4})(\d{2})(\d{2})$/;
const DATE_TIME_VALUE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/;

/** A DTSTART/DTEND as a date, or as wall time in a time zone */
const readDate = (property: IcsProperty, viewerZone: string): IcsDate | undefined => {
  const value = property.value.trim();
  const date = DATE_VALUE.exec(value);
  if (date) return { date: `${date[1]}-${date[2]}-${date[3]}` };
  const time = DATE_TIME_VALUE.exec(value);
  if (!time) return undefined;
  const [, y, mo, d, h, mi, , utc] = time;
  const wall = `${y}-${mo}-${d}T${h}:${mi}`;
  if (utc) {
    // UTC: shown in the viewer's zone
    const unix = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)) / 1000;
    return { wall: unixToWall(unix, viewerZone) ?? wall, tzid: viewerZone };
  }
  const tzid = property.params.TZID;
  // A zone the runtime doesn't know (e.g. a Windows name): the viewer's
  return { wall, tzid: tzid && isValidTimeZone(tzid) ? tzid : viewerZone };
};

/** The date field's value: an all-day range (iCalendar ends are exclusive) or wall times */
const whenOf = (start: IcsDate, end: IcsDate | undefined): DateValue => {
  if ('date' in start) {
    const first = dayNumberOfDate(start.date) ?? 0;
    const endDay = end && 'date' in end ? dayNumberOfDate(end.date) : undefined;
    return endDay !== undefined && endDay - 1 > first
      ? { start: start.date, end: dateOfDayNumber(endDay - 1) }
      : { start: start.date };
  }
  const when: DateValue = { start: start.wall, tzid: start.tzid };
  if (end && 'wall' in end && end.wall > start.wall) when.end = end.wall;
  return when;
};

/** Title, description, place and link of an entry, as form data */
const textFields = (get: (name: string) => IcsProperty | undefined): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  const add = (key: string, name: string) => {
    const value = get(name)?.value;
    const text = value ? unescapeText(value).trim() : '';
    if (text) fields[key] = text;
  };
  add('title', 'SUMMARY');
  add('description', 'DESCRIPTION');
  add('place', 'LOCATION');
  const url = get('URL')?.value.trim();
  if (url && /^https?:\/\//.test(url)) fields.link = url;
  return fields;
};

const draftFrom = (properties: IcsProperty[], viewerZone: string): IcsDraft | undefined => {
  const get = (name: string) => properties.find((p) => p.name === name);
  const uid = get('UID')?.value.trim();
  const startProperty = get('DTSTART');
  const start = startProperty ? readDate(startProperty, viewerZone) : undefined;
  if (!uid || !start) return undefined;
  const endProperty = get('DTEND');
  const end = endProperty ? readDate(endProperty, viewerZone) : undefined;
  const access = get('CLASS')?.value.trim().toUpperCase();
  return {
    uid,
    dTag: icsDTag(uid),
    allDay: 'date' in start,
    formData: { ...textFields(get), when: whenOf(start, end) },
    private: access === 'PRIVATE' || access === 'CONFIDENTIAL',
  };
};

/** The properties of each VEVENT block, in file order */
const veventBlocks = (text: string): IcsProperty[][] => {
  const blocks: IcsProperty[][] = [];
  let current: IcsProperty[] | undefined;
  for (const line of unfold(text)) {
    const property = parseProperty(line);
    if (!property) continue;
    const marker = property.value.trim().toUpperCase() === 'VEVENT';
    if (property.name === 'BEGIN' && marker) current = [];
    else if (property.name === 'END' && marker) {
      if (current) blocks.push(current);
      current = undefined;
    } else current?.push(property);
  }
  return blocks;
};

/**
 * The events of an `.ics` file as drafts, in file order. Entries without a UID or start are
 * left out; recurring entries (RRULE) come as their first occurrence.
 */
export const icsToDrafts = (text: string, viewerZone = defaultTimeZone()): IcsDraft[] =>
  veventBlocks(text).flatMap((block) => draftFrom(block, viewerZone) ?? []);

/** The publish format of CALENDAR_EVENT_MANIFEST for a draft */
export const draftFormatId = (draft: IcsDraft): 'all-day' | 'timed' =>
  draft.allDay ? 'all-day' : 'timed';

/** The kind a draft publishes as */
export const draftKind = (draft: IcsDraft): number =>
  draft.allDay ? ALL_DAY_EVENT_KIND : TIMED_EVENT_KIND;
