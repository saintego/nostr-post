/**
 * @nostr-post/react - NostrPostFeed component
 *
 * React wrapper around the <nostr-post-feed> web component
 */

import '@nostr-post/web'; // Register web components
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Extend HTMLElement for the web component
interface NostrPostFeedElement extends HTMLElement {
  authors?: string[];
  kinds?: number[];
  limit?: number;
  relays?: string[];
  showKind?: boolean;
  showTags?: boolean;
  refresh?: () => Promise<void>;
}

// Declare the custom element for TypeScript/JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-post-feed': React.DetailedHTMLProps<
        React.HTMLAttributes<NostrPostFeedElement>,
        NostrPostFeedElement
      > & {
        authors?: string;
        kinds?: string;
        limit?: string;
        relays?: string;
        'show-kind'?: boolean;
        'show-tags'?: boolean;
      };
    }
  }
}

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
 * Ref type for NostrPostFeed component
 * Exposes the refresh method from the underlying web component
 */
export type NostrPostFeedRef = NostrPostFeedElement;

/**
 * Display a feed of Nostr events
 * 
 * React wrapper around <nostr-post-feed> web component
 */
export const NostrPostFeed = forwardRef<NostrPostFeedElement, NostrPostFeedProps>(
  function NostrPostFeed(
    {
      authors,
      kinds = [1],
      limit = 20,
      relays,
      showKind = false,
      showTags = false,
      className = '',
      dark,
    },
    forwardedRef
  ) {
    const elementRef = useRef<NostrPostFeedElement>(null);

    // Build wrapper class for dark mode
    const wrapperClassName = dark ? 'dark' : '';

    // Expose the web component's methods via ref
    useImperativeHandle(forwardedRef, () => elementRef.current as NostrPostFeedElement, []);

    // Set properties on the web component
    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      // Set all properties
      if (authors) {
        element.authors = authors;
      } else {
        element.authors = undefined;
      }
      element.kinds = kinds;
      element.limit = limit;
      if (relays) {
        element.relays = relays;
      }
      element.showKind = showKind;
      element.showTags = showTags;
    }, [authors, kinds, limit, relays, showKind, showTags]);

    // Don't pass authors/kinds/relays as attributes since we're setting them as properties
    // This prevents conflicts and re-renders
    return (
      <div className={wrapperClassName}>
        <nostr-post-feed
          ref={elementRef as React.RefObject<HTMLElement>}
          className={className}
          show-kind={showKind}
          show-tags={showTags}
        />
      </div>
    );
  }
);
