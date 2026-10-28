# Gigs (example)

Concerts and parties on Nostr: a thin static app on nostr-post's packages (the CDN bundle), for
publishing as an nsite. NIP-52 calendar events, musician pages (NIP-54 wiki) with their music as
players, RSVP, `.ics` import and export.

- **Browse** (`#/`): gigs by city (a geohash prefix, `#g`), genre (`#t`) and date, as a list of days,
  a week or a month (`<nostr-calendar-agenda>`). Cities: any city OpenStreetMap finds while
  typing (`searchNominatim`, as the venue field's city level), and the ones picked before. The filter is in the
  page's link (`#/?city=…&g=…&genre=…&view=…&from=…`); "Share" sends it with the shown gigs as text
  (`agendaText`), "Image" as a picture (`agendaImage`), through the device's share sheet or as a
  copy or download.
- **Gig** (`#/event/<naddr>`): one event with its comments (`<nostr-calendar-event thread editable>`),
  shareable. Edit: who posted it republishes it, anyone else's changes are a suggestion (an update
  comment); removing a performer removes their profile links too, performers without a page are
  edited in the description.
- **Musician** (`#/artist/<d-tag>`, `#/artist-new[/<name>]`, `#/artist-edit/<d-tag>[?add=<JSON>]`):
  a musician's wiki page (type
  `(musician)`); links play (`@nostr-post/plugin-embed`), and its gigs are listed: those that link
  the page (`a` tag) or one of its profiles (`i` tag), so gigs added before the page show too.
- **Add a gig** (`#/add`): paste a post's text and its poster → AI reads it (Claude with your own
  API key, called from the browser; or a prompt you copy to any AI) → a preview of the event, a
  hint when it seems to be on Nostr already → the composer, prefilled, to correct and publish.
  Nothing the AI returns is published without you. The AI's JSON follows the gig manifest
  (`formJsonSchema`). Only links the post's text has are kept (with a poster, others are kept but
  marked "read from the poster"); the performers' links show as players. Optionally the AI also
  suggests performers' Spotify, SoundCloud and YouTube links: those whose site knows them by the
  performer's name (`checkLink`, `namesMatch`) are offered as players to confirm ("It's them"),
  the others are dropped. Performers each get the gig's genres too. Performers are matched to
  their pages by profile link, then name; those without a page stay as text (in the description)
  and their profile links still tag the gig; the form offers "Create page" for them. A page that
  lacks links the post has gets "add them to the page": its edit form with the links added
  (the wiki composer's `additions`).
- **Import** (`#/import`): an `.ics` file (e.g. Facebook's export of your events) → review each
  event in the composer. Its d-tag comes from the event's UID, so importing again updates.
- **Test mode** (on by default): events are signed and shown but never sent to relays (the
  signer's dry run).

App-specific data (the musician and gig manifests, genres) is in `manifests.js`; the AI
prompt and the Claude call in `ai.js`; the link check in `links.js`; pages in `browse.js`,
`addGig.js` and `app.js` (router, gig, musician, import); sharing in `share.js`. Everything else comes from the packages.

Run it with `pnpm preview:pages` and open `/examples/gigs/`. Planned work is in
[ROADMAP.md](../../ROADMAP.md) ("Gig platform example").
