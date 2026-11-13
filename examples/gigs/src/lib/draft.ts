/** A gig draft before publishing: as an event to preview, and gigs that may be the same one */

import { agendaFilter, fromSource, importedFilter, similarEvents } from '@nostr-post/calendar';
import { coordinateEvents } from '@nostr-post/core/coordinator';
import type { PostField } from '@nostr-post/core/types';
import type { DateValue } from '@nostr-post/plugin-date';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { fetchEvents, type SignedEvent } from '@nostr-post/signer';
import { GIG_MANIFEST } from './manifests';

/** What the draft would publish, as an event to preview (unsigned, not sent anywhere) */
export const previewEvent = (formData: Record<string, unknown>, formatId: string): SignedEvent => {
  const plugin = (field: PostField) => pluginRegistry.get(field.uiPlugin);
  const result = coordinateEvents(GIG_MANIFEST, formData, {
    pubkey: '0'.repeat(64),
    selectedFormatId: formatId,
    dTag: 'preview',
    tagSerializer: (value, field) => plugin(field)?.serializeValue?.(value, field),
    extraTagsFn: (value, field) => plugin(field)?.extraTags?.(value, field),
  });
  if (!result.success) throw new Error(result.error.map((e) => e.message).join('; '));
  const [event] = result.data.events;
  if (!event) throw new Error('Nothing to publish');
  return { ...event, id: '0'.repeat(64), sig: '' } as SignedEvent;
};

/** A gig that may be the draft's: from the same page (its source or link), or alike that day */
export interface Duplicate {
  event: SignedEvent;
  /** Imported from the draft's source page, or linking it: surely the same gig */
  samePage: boolean;
}

/** Gigs from the draft's page (`importedFilter`, `fromSource`) */
const fromSamePage = async (formData: Record<string, unknown>): Promise<SignedEvent[]> => {
  const urls = [formData.source, formData.link].flat();
  const filter = importedFilter(urls);
  if (!filter) return [];
  const events = await fetchEvents(filter).catch(() => []);
  const found = urls.flatMap((url) => (typeof url === 'string' ? fromSource(events, url) : []));
  return [...new Set(found)];
};

/** Gigs already on Nostr on the draft's days with an alike title */
const alikeThatDay = async (formData: Record<string, unknown>): Promise<SignedEvent[]> => {
  const when = formData.when as DateValue | undefined;
  const title = typeof formData.title === 'string' ? formData.title : '';
  const start = when?.start?.slice(0, 10);
  if (!when || !start || !title) return [];
  const events = await fetchEvents(agendaFilter({ from: start, days: 1, tzid: when.tzid })).catch(
    () => []
  );
  return similarEvents({ title, when }, events).map(({ event }) => event);
};

/** Gigs that may be the draft's: from the same page first, then alike ones that day */
export const findDuplicates = async (formData: Record<string, unknown>): Promise<Duplicate[]> => {
  const [samePage, alike] = await Promise.all([fromSamePage(formData), alikeThatDay(formData)]);
  const seen = new Set(samePage.map((e) => addressOf(e)));
  return [
    ...samePage.map((event) => ({ event, samePage: true })),
    ...alike.filter((e) => !seen.has(addressOf(e))).map((event) => ({ event, samePage: false })),
  ];
};

/** An event's address (`kind:pubkey:d-tag`), for addressable events */
export const addressOf = (event: { kind: number; pubkey: string; tags: string[][] }) => {
  const d = event.tags.find((t) => t[0] === 'd')?.[1];
  return d === undefined ? undefined : `${event.kind}:${event.pubkey}:${d}`;
};
