/**
 * @nostr-post/calendar - Events already imported from a page
 *
 * An imported event names its source with NIP-48's proxy tag and links it as an `r` tag
 * (CALENDAR_EVENT_MANIFEST's Source field). Relays only index single-letter tags, so they're
 * asked by `#r` (`importedFilter`), and what comes back is matched on the proxy tag or the
 * links (`fromSource`). Before importing an event (the gigs app's AI draft, an `.ics` entry), the
 * user can RSVP to the one already there instead. No DOM dependencies.
 */

import { proxyOf } from '@nostr-post/core/proxy';
import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from '@nostr-post/plugin-date';
import { type CalendarEventLike, latestByAddress } from './agenda';

/** A page's URL as compared: no `www.`, trailing slash or fragment, lowercase scheme and host */
export const sameUrl = (url: string): string => {
  const match = /^([a-z][a-z0-9+.-]*:\/\/)(?:www\.)?([^/?#]+)([^#]*)/i.exec(url.trim());
  if (!match) return url.trim();
  const [, scheme = '', host = '', rest = ''] = match;
  return `${scheme.toLowerCase()}${host.toLowerCase()}${rest.replace(/\/+$/, '')}`;
};

/** The web pages among values (sources, links): http(s) URLs, once each */
const pages = (urls: readonly unknown[]): string[] => [
  ...new Set(
    urls.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
  ),
];

/** Relay filter for calendar events linking any of the pages (`r` tags) */
export const importedFilter = (
  urls: readonly unknown[]
): { kinds: number[]; '#r': string[] } | undefined => {
  const found = pages(urls);
  return found.length
    ? { kinds: [ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND], '#r': found.map((u) => u.trim()) }
    : undefined;
};

/** The events (newest version of each) that come from a page: their proxy tag or a link names it */
export const fromSource = <T extends CalendarEventLike>(events: T[], url: string): T[] => {
  const wanted = sameUrl(url);
  return latestByAddress(events).filter((event) => {
    const source = proxyOf(event.tags)?.id;
    if (source && sameUrl(source) === wanted) return true;
    return event.tags.some((t) => t[0] === 'r' && t[1] && sameUrl(t[1]) === wanted);
  });
};
