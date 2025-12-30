/**
 * @nostr-post/react - NostrPostView component
 *
 * Displays a single Nostr event
 */

import type { CSSProperties } from "react";
import type { SignedEvent } from "../signer";
import { getColors, containerStyles } from "../theme";

export interface NostrPostViewProps {
  /** The event to display */
  event: SignedEvent;
  /** Show event kind badge */
  showKind?: boolean;
  /** Show tags */
  showTags?: boolean;
  /** Show event ID */
  showId?: boolean;
  /** Custom class name */
  className?: string;
  /** Dark mode (auto-detects from prefers-color-scheme if not set) */
  dark?: boolean;
}

/**
 * Display a single Nostr event
 */
export function NostrPostView({
  event,
  showKind = false,
  showTags = false,
  showId = false,
  className = "",
  dark,
}: NostrPostViewProps) {
  const c = getColors(dark);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const styles: Record<string, CSSProperties> = {
    container: {
      ...containerStyles(c),
      padding: 16,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    pubkey: {
      fontFamily: "monospace",
      fontSize: 12,
      color: c.primary,
      background: c.inputBg,
      padding: "4px 8px",
      borderRadius: 4,
    },
    time: {
      fontSize: 12,
      color: c.textSecondary,
    },
    content: {
      color: c.text,
      lineHeight: 1.6,
      whiteSpace: "pre-wrap" as const,
      wordBreak: "break-word" as const,
    },
    kindBadge: {
      display: "inline-block",
      background: c.primary,
      color: "#ffffff",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 12,
      marginRight: 8,
    },
    tags: {
      marginTop: 12,
      paddingTop: 12,
      borderTop: `1px solid ${c.border}`,
    },
    tagLabel: {
      fontSize: 11,
      fontWeight: 600,
      color: c.textSecondary,
      textTransform: "uppercase" as const,
      marginBottom: 8,
    },
    tag: {
      display: "inline-block",
      background: c.inputBg,
      color: c.textSecondary,
      fontSize: 11,
      padding: "2px 6px",
      borderRadius: 4,
      marginRight: 4,
      marginBottom: 4,
      fontFamily: "monospace",
    },
    eventId: {
      marginTop: 12,
      fontSize: 11,
      color: c.textSecondary,
      fontFamily: "monospace",
      wordBreak: "break-all" as const,
    },
  };

  return (
    <div className={className} style={styles.container}>
      <div style={styles.header}>
        <span style={styles.pubkey}>{event.pubkey.slice(0, 16)}...</span>
        <span style={styles.time}>{formatDate(event.created_at)}</span>
      </div>

      {showKind && <span style={styles.kindBadge}>Kind {event.kind}</span>}

      <div style={styles.content}>{event.content}</div>

      {showTags && event.tags.length > 0 && (
        <div style={styles.tags}>
          <div style={styles.tagLabel}>Tags</div>
          {event.tags.map((tag, i) => (
            <span key={i} style={styles.tag}>
              [{tag.join(", ")}]
            </span>
          ))}
        </div>
      )}

      {showId && (
        <div style={styles.eventId}>
          <strong>ID:</strong> {event.id}
        </div>
      )}
    </div>
  );
}
