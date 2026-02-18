/**
 * @nostr-post/react - NostrPostView component
 *
 * React wrapper around the <nostr-post-view> web component
 */

import type { SignedEvent } from '@nostr-post/web';
import '@nostr-post/web'; // Register web components
import { useEffect, useRef } from 'react';

// Extend HTMLElement for the web component
interface NostrPostViewElement extends HTMLElement {
  event?: SignedEvent;
  showKind?: boolean;
  showTags?: boolean;
  showId?: boolean;
}

// Declare the custom element for TypeScript/JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-post-view': React.DetailedHTMLProps<
        React.HTMLAttributes<NostrPostViewElement>,
        NostrPostViewElement
      > & {
        'show-kind'?: boolean;
        'show-tags'?: boolean;
        'show-id'?: boolean;
      };
    }
  }
}

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
  /** Dark mode */
  dark?: boolean;
}

/**
 * Display a single Nostr event
 * 
 * React wrapper around <nostr-post-view> web component
 */
export function NostrPostView({
  event,
  showKind = false,
  showTags = false,
  showId = false,
  className = '',
  dark,
}: NostrPostViewProps) {
  const elementRef = useRef<NostrPostViewElement>(null);

  // Build wrapper class for dark mode
  const wrapperClassName = dark ? 'dark' : '';

  // Set properties on the web component
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.event = event;
    element.showKind = showKind;
    element.showTags = showTags;
    element.showId = showId;
  }, [event, showKind, showTags, showId]);

  return (
    <div className={wrapperClassName}>
      <nostr-post-view
        ref={elementRef as React.RefObject<HTMLElement>}
        className={className}
        show-kind={showKind}
        show-tags={showTags}
        show-id={showId}
      />
    </div>
  );
}
