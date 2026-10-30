/** A gig draft before publishing: as an event to preview, and gigs that may be the same one */

import { agendaFilter, similarEvents } from '@nostr-post/calendar';
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

/** Gigs already on Nostr on the draft's days with an alike title */
export const findDuplicates = async (formData: Record<string, unknown>) => {
  const when = formData.when as DateValue | undefined;
  const title = typeof formData.title === 'string' ? formData.title : '';
  const start = when?.start?.slice(0, 10);
  if (!when || !start || !title) return [];
  const events = await fetchEvents(agendaFilter({ from: start, days: 1, tzid: when.tzid })).catch(
    () => []
  );
  return similarEvents({ title, when }, events);
};

/** An event's address (`kind:pubkey:d-tag`), for addressable events */
export const addressOf = (event: { kind: number; pubkey: string; tags: string[][] }) => {
  const d = event.tags.find((t) => t[0] === 'd')?.[1];
  return d === undefined ? undefined : `${event.kind}:${event.pubkey}:${d}`;
};
