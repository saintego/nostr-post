/**
 * Sharing what the browse page shows ("metal gigs in Bangkok this week"): as a message with the
 * page's link, or as an image. Through the device's share sheet where there is one, else copied
 * (text) or downloaded (image).
 */

import {
  type AgendaWindow,
  agendaFilter,
  agendaSummary,
  agendaText,
  agendaWindowFor,
} from '@nostr-post/calendar';
import { agendaImage } from '@nostr-post/calendar/web';
import { fetchEvents } from '@nostr-post/signer';

/** What the browse page shows */
export interface ShareOptions {
  city: string;
  g: string;
  genre: string;
  from?: string;
  days?: number;
  view: 'list' | 'month';
}

type Status = (text: string) => void;

/** What is shared, e.g. "Metal gigs in Bangkok" */
const titleOf = ({ city, genre }: ShareOptions): string => {
  const what = genre ? `${genre[0]?.toUpperCase()}${genre.slice(1)} gigs` : 'Gigs';
  return city ? `${what} in ${city.split(',')[0]}` : what;
};

/** The shown window's gigs, as the agenda asks for them */
const loadGigs = async ({ g, genre, from, days, view }: ShareOptions) => {
  const window: AgendaWindow = {
    ...agendaWindowFor(from, days, undefined, view),
    eventZones: true,
  };
  const filter: Record<string, unknown> = { ...agendaFilter(window) };
  if (g) filter['#g'] = [g];
  if (genre) filter['#t'] = [genre];
  const events = await fetchEvents(filter as never).catch(() => []);
  return { window, events };
};

const MORE = (n: number) => `+${n} more gigs`;
const EMPTY = 'No gigs yet: add one!';

const isAbort = (error: unknown) => (error as Error | undefined)?.name === 'AbortError';
const messageOf = (error: unknown) => (error as Error | undefined)?.message ?? String(error);

/** Shares the shown gigs as text with the page's link */
export async function shareText(options: ShareOptions, status: Status): Promise<void> {
  status('Loading the gigs…');
  const { window, events } = await loadGigs(options);
  const text = agendaText(events, window, {
    title: titleOf(options),
    link: location.href,
    maxItems: 20,
    moreText: MORE,
    emptyText: EMPTY,
  });
  try {
    if (navigator.share) {
      await navigator.share({ title: titleOf(options), text });
      return status('');
    }
    await navigator.clipboard.writeText(text);
    status('Copied: paste it into a message.');
  } catch (error) {
    // Closing the share sheet isn't an error
    status(isAbort(error) ? '' : `Couldn't share: ${messageOf(error)}`);
  }
}

/** Shares the shown gigs as an image (dark when the page is) */
export async function shareImage(options: ShareOptions, status: Status): Promise<void> {
  status('Making the image…');
  const { window, events } = await loadGigs(options);
  const title = titleOf(options);
  const blob = await agendaImage(agendaSummary(events, window), {
    title,
    footer: location.host + location.pathname,
    dark: document.body.classList.contains('dark'),
    moreText: MORE,
    emptyText: EMPTY,
  });
  const file = new File([blob], `${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}.png`, {
    type: 'image/png',
  });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text: location.href });
      return status('');
    }
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: file.name,
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    status('Downloaded the image.');
  } catch (error) {
    status(isAbort(error) ? '' : `Couldn't share: ${messageOf(error)}`);
  }
}
