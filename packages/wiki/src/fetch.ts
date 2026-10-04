import { fetchEvents } from '@nostr-post/signer';
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

/**
 * Whether any entity (any pubkey) already uses `dTag`. Answers "taken" as soon
 * as one relay returns a matching version; "free" only after every relay
 * answered or timed out (10 s: a cold connection can take several seconds, and
 * a missed answer would let a new entity overwrite another). No `limit: 1`:
 * relays that match `#d` loosely would return one wrong event, which the
 * exact client-side filter then drops.
 */
export function entityDTagExists(
  dTag: string,
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<boolean> {
  return new Promise((resolve) => {
    fetchEvents({ kinds: [WIKI_KIND], '#d': [dTag], limit: 50 } as never, relays, {
      waitForAll: true,
      relayTimeoutMs: 10000,
      onUpdate: (events) => {
        if (events.length > 0) resolve(true);
      },
    })
      .then((events) => resolve(events.length > 0))
      .catch(() => resolve(false));
  });
}
