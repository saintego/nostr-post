/**
 * Support pages: how to support a person or project (Lightning, tip pages, a Bitcoin address), as
 * one addressable event of theirs (NIP-78, kind 30078, d-tag `nostr-post-support`) made with the
 * `support-v1` manifest. Each field is a plugin's entry (`lightning`, `links`, `markdown` for the
 * intro); new kinds of entries come as plugins and fields, not panel code. Extra recipients can
 * come from a NIP-51 list (its `p` tags); nothing adds recipients on its own.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { DEFAULT_RELAYS, fetchEvents, fetchUserRelays, type SignedEvent } from '@nostr-post/signer';
import { extractPrefillFromEvent } from './updates';

export const SUPPORT_KIND = 30078;
/** The d-tag of a person's support page: one per person */
export const SUPPORT_D_TAG = 'nostr-post-support';

const content = (path: string) => ({ kind: SUPPORT_KIND, target: 'content' as const, path });

export const SUPPORT_MANIFEST: NostrPostManifest = {
  id: 'support-v1',
  version: '1.0.0',
  publishFormats: [{ id: 'support', label: 'Support page', kinds: [SUPPORT_KIND], default: true }],
  fields: [
    {
      id: 'intro',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: content('intro'),
      metadata: {
        label: 'Intro',
        description: 'A few words on what support makes possible',
        minHeight: 120,
      },
    },
    {
      id: 'lightning',
      type: 'string',
      uiPlugin: 'lightning',
      mapTo: content('lightning'),
      metadata: {
        label: 'Lightning',
        description: 'Lightning addresses (name@wallet.com) or npubs people can zap',
        multiple: true,
      },
    },
    {
      id: 'links',
      type: 'object',
      uiPlugin: 'links',
      mapTo: content('links'),
      metadata: {
        label: 'Other ways',
        description:
          'Tip pages (Buy Me a Coffee, GitHub Sponsors, Ko-fi, any https link), a Bitcoin address or a note',
      },
    },
  ],
  metadata: {
    name: 'Support',
    description: 'How to support a person or project: Lightning, tip pages, a Bitcoin address',
  },
};

/** The address of a person's support page (`30078:<pubkey>:nostr-post-support`) */
export const supportPageAddress = (pubkey: string): string =>
  `${SUPPORT_KIND}:${pubkey}:${SUPPORT_D_TAG}`;

const newest = (events: SignedEvent[]): SignedEvent | undefined =>
  events.reduce<SignedEvent | undefined>(
    (best, event) => (!best || event.created_at > best.created_at ? event : best),
    undefined
  );

/**
 * A person's support page, the newest version on their relays (their relay list, else `relays`);
 * undefined when they have none
 */
export async function fetchSupportPage(
  pubkey: string,
  relays?: string[]
): Promise<SignedEvent | undefined> {
  const urls = relays ?? (await fetchUserRelays(pubkey).catch(() => DEFAULT_RELAYS));
  const events = await fetchEvents(
    { kinds: [SUPPORT_KIND], authors: [pubkey], '#d': [SUPPORT_D_TAG] },
    urls
  );
  return newest(events.filter((e) => e.pubkey === pubkey));
}

/** A support page's values by field id (`intro`, `lightning`, `links`) */
export const supportPageValues = (
  event: SignedEvent,
  manifest: NostrPostManifest = SUPPORT_MANIFEST
): Record<string, unknown> => extractPrefillFromEvent(event, manifest);

/** The people a NIP-51 list names (`p` tags), each once, in order */
export const listRecipients = (list: { tags: string[][] }): string[] =>
  Array.from(
    new Set(
      list.tags
        .filter((tag) => tag[0] === 'p' && /^[0-9a-f]{64}$/.test(tag[1] ?? ''))
        .map((tag) => tag[1] as string)
    )
  );

/**
 * The people of a NIP-51 list by its address (`<kind>:<pubkey>:<d-tag>`, e.g. a follow set
 * `30000:…`), from its newest version; empty when not found
 */
export async function fetchListRecipients(address: string, relays?: string[]): Promise<string[]> {
  const match = address.match(/^(\d+):([0-9a-f]{64}):(.*)$/);
  if (!match) return [];
  const [, kind = '', author = '', dTag = ''] = match;
  const urls = relays ?? (await fetchUserRelays(author).catch(() => DEFAULT_RELAYS));
  const events = await fetchEvents(
    { kinds: [Number(kind)], authors: [author], '#d': [dTag] },
    urls
  );
  const list = newest(events.filter((e) => e.pubkey === author));
  return list ? listRecipients(list) : [];
}
