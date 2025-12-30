/**
 * @nostr-post/react - NostrPostFeed component
 *
 * Displays a list of Nostr events
 * Styled to match nostr-login design system
 */

import type { CSSProperties } from "react";
import { useNostrEvents } from "../hooks/useNostrEvents";
import { NostrPostView } from "./NostrPostView";

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

// nostr-login color palette (matches @nostr-post/web)
const colors = {
    light: {
        text: "#1f2937",
        textSecondary: "#6b7280",
        primary: "#6366f1",
    },
    dark: {
        text: "#f3f4f6",
        textSecondary: "#9ca3af",
        primary: "#4f46e5",
    },
};

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
    className = "",
    dark,
}: NostrPostFeedProps) {
    const isDark =
        dark ??
        (typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    const c = isDark ? colors.dark : colors.light;

    const { events, isLoading } = useNostrEvents({
        authors,
        kinds,
        limit,
        relays,
        enabled: true,
    });

    const styles: Record<string, CSSProperties> = {
        container: {
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
        loading: {
            textAlign: "center" as const,
            padding: 24,
            color: c.textSecondary,
        },
        empty: {
            textAlign: "center" as const,
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
                    <NostrPostView event={event} showKind={showKind} showTags={showTags} dark={isDark} />
                </div>
            ))}
        </div>
    );
}
