# @nostr-post/plugin-date

Date field plugin for nostr-post: a date, or a date and time with a time zone. On NIP-52 calendar
events it writes the tags clients and relays expect, including the `D` day tags that let an agenda
ask relays for the events of a date range.

## Main entry (no UI)

```ts
import {
  datePlugin,
  dateValueFromTags,
  formatDateValue,
  dayNumbers,
  ALL_DAY_EVENT_KIND, // 31922
  TIMED_EVENT_KIND, // 31923
  type DateValue,
} from '@nostr-post/plugin-date';
```

A field's value is a `DateValue`: `{ start, end?, tzid? }`, wall-clock dates (`YYYY-MM-DD`) or
times (`YYYY-MM-DDTHH:mm`) and an IANA time zone (default: the viewer's). Keeping wall-clock time
lets the same value be written as all-day or timed.

The precision a field is written at (`datePrecision(field, activeKinds?)`):

| Kind written    | Precision                               | Tags                                                                  |
| --------------- | --------------------------------------- | --------------------------------------------------------------------- |
| 31922 (all-day) | `day`                                   | `start`/`end` as `YYYY-MM-DD` (`end` exclusive, per NIP-52), `D` tags |
| 31923 (timed)   | `time`                                  | `start`/`end` as unix seconds, `start_tzid`/`end_tzid`, `D` tags      |
| any other       | `metadata.precision` (`day` by default) | only the field's `mapTo` tag                                          |

`D` tags are unix day numbers (`floor(unix / 86400)`), one per day the value covers, at most
`MAX_DAY_TAGS` (366). NIP-52 defines them for timed events only; all-day events get them too, so
relays can return them by day as well.

| Export                                      | Does                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `CALENDAR_EVENT_MANIFEST`                   | NIP-52 calendar event: title, date, location (venue), description, summary, image, tags; all-day or timed by publish format |
| `datePlugin`                                | The plugin: `validate`, `serializeValue`, `extraTags`, `resolveFromTags`          |
| `datePrecision(field, activeKinds?)`        | `'day'` or `'time'` for the kind the field writes                                 |
| `calendarExtraTags(value, precision)`       | `end`, time zone and `D` tags of a calendar event                                 |
| `dateValueFromTags(tags, tagName?)`         | A `DateValue` from an event's tags (`start`, `end`, `start_tzid`)                 |
| `formatDateValue(value, locale?)`           | Text in the locale, e.g. `Oct 21, 2026, 7:00 PM – 9:00 PM`                         |
| `dayNumbers(value, precision)`              | The `D` tag values                                                                |
| `wallToUnix(wall, tzid)`, `unixToWall(unix, tzid)` | Wall-clock time ↔ unix seconds in a time zone (DST aware, `Intl` only)    |
| `valueTimeZone(value)`, `defaultTimeZone()`, `isValidTimeZone(tzid)` | Time zone helpers                                       |
| `isDateValue(value)`, `wallForPrecision(wall, precision)` | Checks and conversions                                              |

### Agenda

| Export                                   | Does                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `agendaFilter(window, kinds?)`           | Relay filter of a date window: calendar kinds and its `#D` day tags            |
| `agendaDayTags(window)`                  | The `D` values: UTC days the window's local days touch, plus its own dates     |
| `groupEventsByDay(events, window)`       | The window's days that have events, all-day first, then by start; one version per event |
| `eventTiming(event)`, `eventDates(timing, tzid?)` | When an event takes place and on which local dates                    |
| `windowDates(window)`, `todayIn(tzid?)`  | The window's dates; today's date in a time zone                                |
| `latestByAddress(events)`                | Newest version of each addressable event                                       |
| `formatAgendaDate(date, locale?)`        | A day heading, e.g. `Wednesday, October 21, 2026`                              |

A window is `{ from?, days?, tzid? }`: `days` days from `from` (`YYYY-MM-DD`, default today), in
`tzid` (default the viewer's). `<nostr-post-feed agenda>` in `@nostr-post/web` is built on these;
a month grid can use the same functions with a month as the window.

`CALENDAR_EVENT_MANIFEST` is ready to use: `<nostr-post-composer .manifest=${CALENDAR_EVENT_MANIFEST}>`.
Its fields use the `date`, `venue`, `media` and `hashtag` plugins, which the composer loads by
itself. How to build your own is in [MANIFEST.md](../../MANIFEST.md#dates).

## `/web`

```ts
import '@nostr-post/plugin-date/web';
```

Defines `<np-date-input>` and `<np-date-view>` and registers the plugin with them. The composer
loads it by itself for manifests with `uiPlugin: 'date'`.

- `<np-date-input>`: `.value`, `.field`, `.activeKinds` (from the composer: a date picker for
  all-day, date-time pickers and a time zone for timed), an optional end. Dispatches
  `np-value-changed`.
- `<np-date-view>`: the value in the viewer's locale, with the time zone of timed values.

Both take `messages` (`Partial<DateMessages>`, defaults in `DEFAULT_DATE_MESSAGES`) for
translations.
