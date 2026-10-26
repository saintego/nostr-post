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
| `datePlugin`                                | The plugin: `validate`, `serializeValue`, `extraTags`, `resolveFromTags`          |
| `datePrecision(field, activeKinds?)`        | `'day'` or `'time'` for the kind the field writes                                 |
| `calendarExtraTags(value, precision)`       | `end`, time zone and `D` tags of a calendar event                                 |
| `dateValueFromTags(tags, tagName?)`         | A `DateValue` from an event's tags (`start`, `end`, `start_tzid`)                 |
| `formatDateValue(value, locale?)`           | Text in the locale, e.g. `Oct 21, 2026, 7:00 PM – 9:00 PM`                         |
| `dayNumbers(value, precision)`              | The `D` tag values                                                                |
| `wallToUnix(wall, tzid)`, `unixToWall(unix, tzid)` | Wall-clock time ↔ unix seconds in a time zone (DST aware, `Intl` only)    |
| `valueTimeZone(value)`, `defaultTimeZone()`, `isValidTimeZone(tzid)`, `timeZones()` | Time zone helpers; `timeZones()` lists the zones the runtime knows |
| `isDateValue(value)`, `wallForPrecision(wall, precision)` | Checks and conversions                                              |

Calendar events themselves (the event manifest, agenda and month views, RSVP, calendars,
iCalendar) are [`@nostr-post/calendar`](../calendar/README.md), built on this field.

## `/web`

```ts
import '@nostr-post/plugin-date/web';
```

Defines `<np-date-input>` and `<np-date-view>` and registers the plugin with them. The composer
loads it by itself for manifests with `uiPlugin: 'date'`.

- `<np-date-input>`: `.value`, `.field`, `.activeKinds` (from the composer: a date picker for
  all-day, date-time pickers and a time zone for timed, searchable through the known zones), an
  optional end that can't be set before the start (`min`, and a message while it is), `.error`
  (the composer's error; the input's own message hides while it shows). Dispatches
  `np-value-changed`.
- `<np-date-view>`: the value in the viewer's locale, with the time zone of timed values.

Both take `messages` (`Partial<DateMessages>`, defaults in `DEFAULT_DATE_MESSAGES`) for translations.
