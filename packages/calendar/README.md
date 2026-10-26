# @nostr-post/calendar

NIP-52 calendars for nostr-post: calendar events (all-day 31922, timed 31923) with their manifest,
agenda and month views, RSVPs (31925), calendars (31924), duplicate checks and iCalendar import and
export. A domain package next to `@nostr-post/wiki`: the date field itself is
[`@nostr-post/plugin-date`](../plugin-date/README.md), calendars are lists of
[`@nostr-post/plugin-list`](../plugin-list/README.md) (`CALENDAR_LISTS`).

| Entry                         | What                                                                |
| ----------------------------- | ------------------------------------------------------------------- |
| `@nostr-post/calendar`        | Logic without UI: manifest, agenda/month windows, RSVP, calendars, duplicates |
| `@nostr-post/calendar/ics`    | iCalendar: `eventsToIcs`, `icsToDrafts`, `icsDTag` (pure, no relays) |
| `@nostr-post/calendar/web`    | Elements: `<nostr-calendar-agenda>`, `<nostr-calendar-event>`, RSVP, Add to calendar, `.ics` |

## Main entry (no UI)

```ts
import { CALENDAR_EVENT_MANIFEST, agendaFilters, groupEventsByDay } from '@nostr-post/calendar';
```

`CALENDAR_EVENT_MANIFEST` is ready to use: `<nostr-post-composer .manifest=${CALENDAR_EVENT_MANIFEST}>`.
All-day or timed is its publish format. Its fields use the `date`, `venue`, `profile`, `media` and
`hashtag` plugins, which the composer loads by itself. How to build your own is in
[MANIFEST.md](../../MANIFEST.md#dates).

### Agenda

| Export                                   | Does                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `agendaFilter(window, kinds?)`           | Relay filter of a date window: calendar kinds and its `#D` day tags            |
| `agendaDayTags(window)`                  | The `D` values: UTC days the window's local days touch, plus its own dates     |
| `groupEventsByDay(events, window)`       | The window's days that have events, all-day first, then by start; one version per event |
| `eventTiming(event)`, `eventDates(timing, tzid?)` | When an event takes place and on which local dates                    |
| `windowDates(window)`, `todayIn(tzid?)`  | The window's dates; today's date in a time zone                                |
| `shiftWindow(window, steps)`, `formatWindowRange(window, locale?)` | First day of the window `steps` windows on; the range as text |
| `latestByAddress(events)`                | Newest version of each addressable event                                       |
| `formatAgendaDate(date, locale?)`        | A day heading, e.g. `Wednesday, October 21, 2026`                              |

A window is `{ from?, days?, tzid? }`: `days` days from `from` (`YYYY-MM-DD`, default today), in
`tzid` (default the viewer's). `<nostr-calendar-agenda>` (`/web`) is built on these;
a month grid can use the same functions with a month as the window.

### Months

| Export                                           | Does                                                     |
| ------------------------------------------------ | -------------------------------------------------------- |
| `monthWindow(month, tzid?)`, `monthOf(date?)`    | A month (`YYYY-MM`) as an agenda window; the month of a date (today by default) |
| `monthGrid(month, weekStart?)`, `weekStartOf(locale?)` | The month's weeks of 7 dates from the locale's first weekday (`Intl.Locale` week info; Monday where unknown), with the days of the months around it |
| `shiftMonth(month, steps)`, `formatMonth(month, locale?)`, `weekdayNames(weekStart?, locale?)` | Moving and naming months; short weekday names |

`<nostr-calendar-agenda view="month">` shows a month as a grid on these.

### iCalendar (.ics): `@nostr-post/calendar/ics`

| Export                                   | Does                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `eventsToIcs(events, name?)`             | An `.ics` file (RFC 5545) of calendar events: UID = the event's address, all-day dates or UTC times, title, description, location, link |
| `icsToDrafts(text, viewerZone?)`         | The entries of an `.ics` file (e.g. a Facebook events export) as drafts: `{ uid, dTag, allDay, formData, private }`, `formData` for CALENDAR_EVENT_MANIFEST (title, when, place, link, description). `CLASS:PRIVATE` entries are flagged, not left out |
| `icsDTag(uid)`                           | `ics:<UID>`: publishing a draft with it replaces the event on a later import instead of adding a copy |
| `draftFormatId(draft)`, `draftKind(draft)` | The publish format (`all-day` / `timed`) and kind of a draft            |
| `fetchEventsAsIcs(addresses, options?)`  | The `.ics` of events loaded from relays by address                       |

### Duplicates

| Export                                    | Does                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `similarEvents(draft, events, options?)`  | Events sharing a day with a draft (`{ title, when }`) whose titles are alike (`minScore`, default 0.5), most alike first: before creating an event, offer the existing one |
| `titleSimilarity(a, b)`                   | 0–1: shared words over the shorter title's (case, accents, punctuation and filler words ignored) |

Ask relays for the candidates with `agendaFilter` for the draft's days, plus `#g` for its area.

### RSVP (kind 31925)

| Export                                         | Does                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `rsvpEvent(address, status, pubkey, options?)` | An unsigned RSVP: `d` and `a` = the event's address (one per person, replaced by a new answer), `status`, `fb` `busy` unless declined, `p` the event's author |
| `rsvpFilter(addresses)`, `fetchRsvps(addresses, options?)` | Relay filter for, and reading of, the RSVPs to events          |
| `publishRsvp(address, status, options?)`       | Signs (asks the signer) and publishes the user's answer; a `Result`      |
| `summarizeRsvps(events, address)`, `withAnswer(summary, pubkey, status)`, `peopleByStatus(summary)` | Counts per status, each person's newest answer; who gave each |
| `isCalendarEventAddress(address)`, `RSVP_KIND`, `RSVP_STATUSES` | Checks and constants                                    |

`status` is `accepted`, `tentative` or `declined`.

### Calendars (kind 31924)

A calendar is a named list of calendar events (`a` tags), anyone's events. It is edited with
`@nostr-post/plugin-list`'s functions and `{ listKind: CALENDAR_LISTS }`; this package reads it:

| Export                                    | Does                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `fetchCalendarItems(address, options?)`   | The calendar event addresses in a calendar's newest version; empty when it's missing or deleted |
| `calendarEventFilters(addresses)`         | Relay filters for events by address, one per kind and author            |
| `publishesCalendarEvents(manifest)`       | Whether a manifest publishes kind 31922 or 31923                        |

Loading events by address finds all-day events of clients that write no `D` tags, which a day
filter misses. `<nostr-calendar-agenda calendar="31924:…">` is built on these.


### What an agenda asks relays for

| Export                        | Does                                                                     |
| ----------------------------- | ------------------------------------------------------------------------ |
| `agendaFilters(query)`        | Relay filters of an agenda: `{ window, kinds?, authors?, tagFilters?, calendarItems?, limit? }` → the window's `#D` day tags with the tag filters (e.g. `#g` area, `#t` genre), or a calendar's events by address; none for an empty calendar |
| `agendaWindowFor(from, days, tzid, view)` | The window: `days` from `from`, or in month view the month of `from` |
| `AGENDA_LIMIT`                | 500: events asked for at most                                            |

## `/web`

```ts
import '@nostr-post/calendar/web';
```

Defines the elements and plugs them into the views (`@nostr-post/plugins/entities`): event actions
on events made with calendar manifests, and the kind view of 31922/31923.

### `<nostr-calendar-agenda>`

```html
<nostr-calendar-agenda from="2026-10-21" days="7"></nostr-calendar-agenda>
<nostr-calendar-agenda view="month" calendar="31924:<pubkey>:<d-tag>"></nostr-calendar-agenda>
```

| Property / attribute | Description |
| -------------------- | ----------- |
| `from`               | First day, `YYYY-MM-DD` (in month view: a day of the month). Default today |
| `days`               | Number of days (default 30, at most 366) |
| `view`               | `list` (default) or `month`: the month as a grid of weeks (from the locale's first weekday) with each day's event titles, above its list |
| `time-zone`          | IANA time zone of the days (default the viewer's) |
| `calendar`           | One calendar (`31924:…`): its events by address, so also all-day events of clients that write no `D` tags; its maintainer's update comments apply |
| `kinds`, `authors`, `tagFilters` | Narrow the events, e.g. `{ '#g': ['u09t'], '#t': ['punk'] }` |
| `relays`, `manifest` (default `CALENDAR_EVENT_MANIFEST`), `editable`, `comments-enabled`, `reactions-enabled` | Passed to the feed |
| `messages`           | `Partial<AgendaMessages>` (`DEFAULT_AGENDA_MESSAGES`) |

Previous / Today / Next move the window (by months in month view) and fire
`nostr-calendar-agenda-change` (`{ from, days, view }`). It is a `<nostr-post-feed>` with the agenda
as its layout (`<nostr-calendar-days>`): events keep their comments, reactions and actions, and while
the next window loads the shown days stay, dimmed.

### `<nostr-calendar-event>`

One event by `address`: loads its newest version and shows it with the calendar manifest. It is the
kind view of 31922/31923, so a post linking an event (`nostr:naddr…`) shows it in place.

### Event actions

On events made with manifests that publish calendar events (`publishesCalendarEvents`):

- `<np-rsvp>`: Going / Maybe / Can't go with counts, and "Who" (once someone answered): the people of
  each answer with avatars and names (plugin-profile's `<np-profile-view>`). Loading the counts needs
  no signer. `Partial<RsvpMessages>` (`DEFAULT_RSVP_MESSAGES`).
- `<np-calendar-save>`: Add to calendar: plugin-list's `<np-list-save>` with the user's calendars and
  calendar wording (`DEFAULT_CALENDAR_SAVE_MESSAGES` over `DEFAULT_LIST_MESSAGES`).
- `<np-ics-download>`: `.ics`: loads the event and downloads it for calendar apps
  (`DEFAULT_ICS_MESSAGES`).
