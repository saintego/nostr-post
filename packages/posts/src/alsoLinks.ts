/**
 * @nostr-post/posts - Linking a post to the pages a page or event links (`add.also` of a
 * section): a photo added to a gig can also show on its venue's page and an artist's page.
 */

import { refAddresses } from '@nostr-post/core/postRoles';
import type { DisplayableEvent, NostrPostManifest, PostSection } from '@nostr-post/core/types';
import { DEFAULT_RELAYS, fetchEvents, type SignedEvent } from '@nostr-post/signer';
import { targetFilters } from './references';
import { newestItems } from './sections';
import { addressOf } from './threads';
import { extractPrefillFromEvent } from './updates';

/** A page "Add" offers to link too: its address, the field linking it, ticked or not */
export interface AlsoLink {
  address: string;
  fieldId: string;
  checked: boolean;
}

/**
 * The pages `section.add.also` offers: those the owner `event`'s fields link (read with its
 * `manifest`), each once, without the event itself
 */
export function alsoLinkOptions(
  section: PostSection,
  manifest: NostrPostManifest,
  event: DisplayableEvent,
  self?: string
): AlsoLink[] {
  const also = section.add?.also ?? [];
  if (also.length === 0) return [];
  const values = extractPrefillFromEvent(event, manifest);
  const seen = new Set(self ? [self] : []);
  return also.flatMap(({ field, checked = false }) =>
    refAddresses(values[field]).flatMap((address) => {
      if (seen.has(address)) return [];
      seen.add(address);
      return [{ address, fieldId: field, checked }];
    })
  );
}

/** The composer's `extraTags` linking these addresses (`a` tags) */
export const alsoLinkTags = (addresses: string[]): string =>
  addresses.map((address) => `a:${address}`).join(',');

/** A page "Add" offers to link too, with its name to show */
export interface AlsoLinkOption extends AlsoLink {
  label: string;
}

/** A page's name from its title, without the type in brackets: "Faustus (musician)" → "Faustus" */
const pageName = (event: SignedEvent | undefined, address: string): string => {
  const title = event?.tags.find((t) => t[0] === 'title')?.[1] ?? '';
  return (
    title.replace(/\s*\([^)]*\)\s*$/, '').trim() ||
    // Until the page arrives: its d-tag as words ("1981-soul-&-sold-musician" → "1981 soul & sold musician")
    address.split(':').slice(2).join(':').replace(/-/g, ' ')
  );
};

/**
 * The pages `section.add.also` offers for the page or event at `address`, with their names:
 * loads its newest version (unless given as `event`) and the pages it links. Quick: the event
 * page has usually loaded both (the session cache answers at once), else the first relay's
 * answer is enough. `onOptions` gets the options as soon as they're known, labelled from the
 * pages' addresses until their titles arrive
 */
export async function loadAlsoLinks(
  section: PostSection,
  manifest: NostrPostManifest,
  address: string,
  {
    event,
    relays = DEFAULT_RELAYS,
    onOptions,
  }: {
    event?: DisplayableEvent;
    relays?: string[];
    onOptions?: (options: AlsoLinkOption[]) => void;
  } = {}
): Promise<AlsoLinkOption[]> {
  if (!section.add?.also?.length) return [];
  const fetch = (targets: string[]) =>
    fetchEvents(targetFilters(targets), relays)
      .then(newestItems)
      .catch(() => [] as SignedEvent[]);
  const owner = event ?? (await fetch([address]))[0];
  if (!owner) return [];
  const options = alsoLinkOptions(section, manifest, owner, address);
  onOptions?.(options.map((o) => ({ ...o, label: pageName(undefined, o.address) })));
  const pages = await fetch(options.map((o) => o.address));
  const byAddress = new Map(pages.map((p) => [addressOf(p) ?? p.id, p]));
  return options.map((o) => ({ ...o, label: pageName(byAddress.get(o.address), o.address) }));
}
