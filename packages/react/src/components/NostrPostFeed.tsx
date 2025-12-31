/**
 * @nostr-post/react - NostrPostFeed component
 *
 * Displays a list of Nostr events
 */

import type { CSSProperties } from 'react';
import { useNostrEvents } from '../hooks/useNostrEvents';
import { getColors } from '../theme';
import { NostrPostView } from './NostrPostView';

export interface NostrPostFeedProps {
  /** Filter by authors (pubkeys) */
  authors?: string[];
  /** Filter by kinds */
  kinds?: number[];
  /** Max events to fetch */
  limit?: number;
  /** Custom relay URLs */
  relays?: string[];
  /** Show event kind badge */
  showKind?: boolean;
  /** Show tags */
  showTags?: boolean;
  /** Custom class name */
  className?: string;
  /** Dark mode */
  dark?: boolean;
}

/**
 * Display a feed of Nostr events
 */
export function NostrPostFeed({
  authors,
  kinds = [1],
  limit = 20,
  relays,
  showKind = false,
  showTags = false,
  className = '',
  dark,
}: NostrPostFeedProps) {
  const c = getColors(dark);

  const { events, isLoading } = useNostrEvents({
    authors,
    kinds,
    limit,
    relays,
    enabled: true,
  });

  const styles: Record<string, CSSProperties> = {
    container: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    loading: {
      textAlign: 'center' as const,
      padding: 24,
      color: c.textSecondary,
    },
    empty: {
      textAlign: 'center' as const,
      padding: 24,
      color: c.textSecondary,
    },
    eventItem: {
      marginBottom: 12,
    },
  };

  if (isLoading) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.empty}>No posts yet</div>
      </div>
    );
  }

  return (
    <div className={className} style={styles.container}>
      {events.map((event) => (
        <div key={event.id} style={styles.eventItem}>
          <NostrPostView event={event} showKind={showKind} showTags={showTags} dark={dark} />
        </div>
      ))}
    </div>
  );
}
