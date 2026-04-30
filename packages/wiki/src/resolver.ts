/**
 * @nostr-post/wiki - Entity resolver
 *
 * Multiple pubkeys can publish kind:30818 events with the same d-tag.
 * The resolver picks the "canonical" event from the set.
 *
 * Default strategy: defer-aware, newest-wins.
 *   - Events that carry a `defer` marker on an `a` or `e` tag are excluded
 *     from the candidate pool (they explicitly yield to another version).
 *   - If all events defer, fall back to the full set (newest wins).
 */

export interface WikiEvent {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export type WikiResolverFunction = (events: WikiEvent[]) => WikiEvent | null;

/**
 * Default resolver: defer-aware newest-wins.
 *
 * An event "defers" when any of its `a` or `e` tags carries the marker
 * `"defer"` at index 3 (NIP-54 fork/defer convention).
 */
export const defaultResolver: WikiResolverFunction = (events: WikiEvent[]): WikiEvent | null => {
  if (events.length === 0) return null;

  // Collect IDs of events that explicitly defer to another version
  const deferredIds = new Set(
    events
      .filter((e) => e.tags.some((t) => (t[0] === 'a' || t[0] === 'e') && t[3] === 'defer'))
      .map((e) => e.id)
  );

  const candidates = events.filter((e) => !deferredIds.has(e.id));
  const pool = candidates.length > 0 ? candidates : events;

  return pool.reduce<WikiEvent | null>(
    (newest, event) => (newest === null || event.created_at > newest.created_at ? event : newest),
    null
  );
};

/**
 * Build the full set of `a` tag values for all events in the pool.
 * Used to perform the second-hop query: fetch all reviews that cited any version.
 *
 * Returns strings in the form "30818:<pubkey>:<d-tag>".
 */
export function collectEntityATags(events: WikiEvent[]): string[] {
  const seen = new Set<string>();
  for (const event of events) {
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    if (dTag) {
      seen.add(`30818:${event.pubkey}:${dTag}`);
    }
  }
  return [...seen];
}
