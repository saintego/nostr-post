/**
 * @nostr-post/react - useNostrEvents hook
 *
 * Fetches and manages Nostr events
 */

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_RELAYS, type SignedEvent, fetchEvents } from '../signer';

export interface UseNostrEventsOptions {
  kinds?: number[];
  authors?: string[];
  limit?: number;
  relays?: string[];
  enabled?: boolean;
}

export interface UseNostrEventsReturn {
  events: SignedEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addEvent: (event: SignedEvent) => void;
}

/**
 * Hook for fetching Nostr events
 *
 * @example
 * ```tsx
 * function Feed() {
 *   const { events, isLoading, refetch } = useNostrEvents({
 *     kinds: [1],
 *     authors: [pubkey],
 *     limit: 20,
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return events.map(e => <PostView key={e.id} event={e} />);
 * }
 * ```
 */
export function useNostrEvents(options: UseNostrEventsOptions = {}): UseNostrEventsReturn {
  const { kinds = [1], authors, limit = 20, relays = DEFAULT_RELAYS, enabled = true } = options;

  const [events, setEvents] = useState<SignedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const filter: { kinds?: number[]; authors?: string[]; limit?: number } = {
        kinds,
        limit,
      };

      if (authors && authors.length > 0) {
        filter.authors = authors;
      }

      const fetchedEvents = await fetchEvents(filter, relays);
      setEvents(fetchedEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [kinds, authors, limit, relays, enabled]);

  const addEvent = useCallback((event: SignedEvent) => {
    setEvents((prev) => {
      // Don't add duplicates
      if (prev.some((e) => e.id === event.id)) {
        return prev;
      }
      // Add to beginning and sort by created_at
      return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
    });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    events,
    isLoading,
    error,
    refetch,
    addEvent,
  };
}
