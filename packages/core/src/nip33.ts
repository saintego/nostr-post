/**
 * @nostr-post/core - NIP-33 Parameterized Replaceable Events utilities
 *
 * NIP-33 defines kinds 30000-39999 as parameterized replaceable events.
 * The `d` tag differentiates events of the same kind from the same author.
 * Clients SHOULD show only the latest version per kind:pubkey:d-tag address.
 */

/**
 * From a list of addressable items (anything with pubkey, dTag, createdAt),
 * keep only the newest entry per pubkey+dTag address, sorted by createdAt desc.
 * This is the NIP-33 deduplication rule applied client-side.
 */
export function selectLatestByAddress<
  T extends { pubkey: string; dTag: string; createdAt: number },
>(items: T[]): T[] {
  const latestByAddress = new Map<string, T>();

  for (const item of items) {
    const key = `${item.pubkey}:${item.dTag}`;
    const existing = latestByAddress.get(key);
    if (!existing || item.createdAt > existing.createdAt) {
      latestByAddress.set(key, item);
    }
  }

  return Array.from(latestByAddress.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Filter a list of events down to only the latest version of each addressable event
 * (kinds 30000-39999), keyed by kind + pubkey + d-tag. Non-addressable events are
 * passed through unchanged. Relative order of surviving events is preserved.
 *
 * Use this in feeds and lists to avoid showing stale relay copies alongside the
 * current version of an addressable event.
 */
export function filterLatestAddressableEvents<
  T extends { kind: number; pubkey: string; created_at: number; tags: string[][] },
>(events: T[]): T[] {
  const isAddressable = (kind: number) => kind >= 30000 && kind < 40000;
  const latestByAddress = new Map<string, T>();

  for (const event of events) {
    if (!isAddressable(event.kind)) continue;
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1] ?? '';
    const key = `${event.kind}:${event.pubkey}:${dTag}`;
    const existing = latestByAddress.get(key);
    if (!existing || event.created_at > existing.created_at) {
      latestByAddress.set(key, event);
    }
  }

  return events.filter((event) => {
    if (!isAddressable(event.kind)) return true;
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1] ?? '';
    const key = `${event.kind}:${event.pubkey}:${dTag}`;
    return latestByAddress.get(key) === event;
  });
}
