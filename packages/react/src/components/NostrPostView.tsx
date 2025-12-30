/**
 * @nostr-post/react - NostrPostView component
 *
 * Displays a single Nostr event
 */


import type { SignedEvent } from "../signer";

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
}

/**
 * View component for displaying Nostr events
 *
 * @example
 * ```tsx
 * <NostrPostView event={event} />
 * ```
 */
export function NostrPostView({
  event,
  showKind = true,
  showTags = false,
  showId = true,
  className = "",
}: NostrPostViewProps) {
  const formatTimestamp = (ts: number) => new Date(ts * 1000).toLocaleString();

  const truncatePubkey = (pk: string) =>
    pk.length <= 16 ? pk : `${pk.slice(0, 8)}...${pk.slice(-8)}`;

  return (
    <div className={`np-view ${className}`}>
      <div className="np-view-header">
        {showKind && <span className="np-view-kind">Kind {event.kind}</span>}
        <span className="np-view-pubkey" title={event.pubkey}>
          {truncatePubkey(event.pubkey)}
        </span>
        <span className="np-view-time">{formatTimestamp(event.created_at)}</span>
      </div>

      <div className="np-view-content">{event.content || <em>No content</em>}</div>

      {showTags && event.tags.length > 0 && (
        <div className="np-view-tags">
          {event.tags.map((tag, i) => (
            <span key={i} className="np-tag">
              <strong>{tag[0]}:</strong> {tag.slice(1).join(", ")}
            </span>
          ))}
        </div>
      )}

      {showId && <div className="np-view-id">ID: {event.id}</div>}

      <style>{viewStyles}</style>
    </div>
  );
}

const viewStyles = `
  .np-view {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
  }
  .np-view-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 12px;
  }
  .np-view-kind {
    padding: 2px 8px;
    background: #6366f1;
    color: white;
    border-radius: 4px;
    font-weight: 600;
  }
  .np-view-pubkey {
    font-family: monospace;
    color: #6b7280;
  }
  .np-view-time {
    color: #6b7280;
    margin-left: auto;
  }
  .np-view-content {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    color: #1f2937;
  }
  .np-view-tags {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
  }
  .np-tag {
    display: inline-block;
    padding: 2px 8px;
    margin: 0.25rem 0.25rem 0.25rem 0;
    background: #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    color: #6b7280;
  }
  .np-view-id {
    margin-top: 0.5rem;
    font-size: 11px;
    font-family: monospace;
    color: #9ca3af;
    word-break: break-all;
  }
`;
