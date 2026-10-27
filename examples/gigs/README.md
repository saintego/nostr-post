# Gigs (example)

Concerts and parties on Nostr: a thin static app on nostr-post's packages (the CDN bundle), for
publishing as an nsite. NIP-52 calendar events, artist pages (NIP-54 wiki) with their music as
players, RSVP, `.ics` import and export.

- **Browse** (`#/`): gigs by city (a geohash prefix, `#g`), genre (`#t`) and date, as a list of days
  or a month (`<nostr-calendar-agenda>`).
- **Gig** (`#/event/<naddr>`): one event (`<nostr-calendar-event>`), shareable.
- **Artist** (`#/artist/<d-tag>`, `#/artist-new`): an artist's wiki page; links play
  (`@nostr-post/plugin-embed`).
- **Add a gig** (`#/add`): paste a post's text and its poster → AI reads it (Claude with your own
  API key, called from the browser; or a prompt you copy to any AI) → a preview of the event, a
  hint when it seems to be on Nostr already → the composer, prefilled, to correct and publish.
  Nothing the AI returns is published without you.
- **Import** (`#/import`): an `.ics` file (e.g. Facebook's export of your events) → review each
  event in the composer. Its d-tag comes from the event's UID, so importing again updates.
- **Test mode** (on by default): events are signed and shown but never sent to relays (the
  signer's dry run).

App-specific data (the artist and gig manifests, cities, genres) is in `manifests.js`; the AI
prompt and the Claude call in `ai.js`. Everything else comes from the packages.

Run it with `pnpm preview:pages` and open `/examples/gigs/`. Planned work is in
[ROADMAP.md](../../ROADMAP.md) ("Gig platform example").
