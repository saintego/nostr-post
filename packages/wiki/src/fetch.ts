import { fetchEvents, fetchEventsFromRelay } from '@nostr-post/signer';
import { DEFAULT_WIKI_RELAYS, WIKI_KIND } from './nip54';
import type { WikiEvent } from './resolver';

/**
 * Every published version of an entity (all pubkeys), newest first. Waits for
 * all relays (5 s timeout each), so the newest version isn't missed.
 */
export async function fetchEntityVersions(
  dTag: string,
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<WikiEvent[]> {
  const events = (await fetchEvents(
    { kinds: [WIKI_KIND], '#d': [dTag], limit: 50 } as never,
    relays,
    { waitForAll: true, relayTimeoutMs: 5000 }
  )) as unknown as WikiEvent[];
  return [...events].sort((a, b) => b.created_at - a.created_at);
}

/** Whether a d-tag is used by an entity; `unknown` when a relay couldn't be asked */
export type DTagAvailability = 'taken' | 'free' | 'unknown';

/**
 * Whether any entity (any pubkey) already uses `dTag`. "taken" as soon as one
 * relay returns a matching version; "free" only after every relay answered
 * (10 s timeout each: a cold connection can take several seconds); "unknown"
 * if a relay failed or timed out and none had it, since a missed answer could let a new
 * entity overwrite another. No `limit: 1`: relays that match `#d` loosely would
 * return one wrong event, which the exact client-side filter then drops.
 */
export function checkEntityDTag(
  dTag: string,
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<DTagAvailability> {
  const filter = { kinds: [WIKI_KIND], '#d': [dTag], limit: 50 } as never;
  return new Promise((resolve) => {
    const answers = relays.map((relay) =>
      fetchEventsFromRelay(relay, filter, {
        relayTimeoutMs: 10000,
        // A relay that didn't answer in time doesn't count as "not found"
        rejectOnTimeout: true,
        onEvent: () => resolve('taken'),
      })
    );
    Promise.allSettled(answers).then((settled) => {
      if (settled.some((r) => r.status === 'fulfilled' && r.value.length > 0)) resolve('taken');
      else resolve(settled.some((r) => r.status === 'rejected') ? 'unknown' : 'free');
    });
  });
}
