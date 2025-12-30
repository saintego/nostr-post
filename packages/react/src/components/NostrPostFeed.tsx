/**
 * @nostr-post/react - NostrPostFeed component
 *
 * Displays a list of Nostr events
 */

import React from "react";
import { useNostrEvents, type UseNostrEventsOptions } from "../hooks/useNostrEvents";
import { NostrPostView } from "./NostrPostView";

export interface NostrPostFeedProps extends UseNostrEventsOptions {
    /** Show loading state */
    showLoading?: boolean;
    /** Custom loading component */
    loadingComponent?: React.ReactNode;
    /** Custom empty state component */
    emptyComponent?: React.ReactNode;
    /** Show event kind badge */
    showKind?: boolean;
    /** Show tags */
    showTags?: boolean;
    /** Show event ID */
    showId?: boolean;
    /** Custom class name */
    className?: string;
}

/**
 * Feed component for displaying multiple Nostr events
 *
 * @example
 * ```tsx
 * <NostrPostFeed authors={[pubkey]} kinds={[1]} limit={20} />
 * ```
 */
export function NostrPostFeed({
    kinds,
    authors,
    limit,
    relays,
    enabled = true,
    showLoading = true,
    loadingComponent,
    emptyComponent,
    showKind = true,
    showTags = false,
    showId = true,
    className = "",
}: NostrPostFeedProps) {
    const { events, isLoading, error } = useNostrEvents({
        kinds,
        authors,
        limit,
        relays,
        enabled,
    });

    if (isLoading && showLoading) {
        return loadingComponent ?? <div className="np-loading">Loading posts...</div>;
    }

    if (error) {
        return <div className="np-feed-error">Error: {error}</div>;
    }

    if (events.length === 0) {
        return emptyComponent ?? <div className="np-empty">No posts yet.</div>;
    }

    return (
        <div className={`np-feed ${className}`}>
            {events.map((event) => (
                <NostrPostView
                    key={event.id}
                    event={event}
                    showKind={showKind}
                    showTags={showTags}
                    showId={showId}
                />
            ))}
            <style>{feedStyles}</style>
        </div>
    );
}

const feedStyles = `
  .np-feed {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .np-loading, .np-empty {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }
  .np-feed-error {
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    color: #dc2626;
  }
`;
