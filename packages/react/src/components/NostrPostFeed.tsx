/**
 * @nostr-post/react - NostrPostFeed component
 *
 * React wrapper around the <nostr-post-feed> web component
 */

import '@nostr-post/web'; // Register web components
import type { FetchFilter } from '@nostr-post/signer';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Extend HTMLElement for the web component
interface NostrPostFeedElement extends HTMLElement {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  search?: string;
  limit?: number;
  relays?: string[];
  filterTags?: string;
  tagFilters?: Record<string, string[]>;
  filters?: FetchFilter[];
  manifest?: import('@nostr-post/core/types').NostrPostManifest;
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
        ids?: string;
        authors?: string;
        kinds?: string;
        since?: string;
        until?: string;
        search?: string;
        limit?: string;
        relays?: string;
        'filter-tags'?: string;
        'show-kind'?: boolean;
        'show-tags'?: boolean;
      };
    }
  }
}

export interface NostrPostFeedProps {
  /** Filter by event ids */
  ids?: string[];
  /** Filter by authors (pubkeys) */
  authors?: string[];
  /** Filter by kinds */
  kinds?: number[];
  /** Fetch events created at or after this unix timestamp */
  since?: number;
  /** Fetch events created at or before this unix timestamp */
  until?: number;
  /** Full-text search query (relay-dependent, NIP-50) */
  search?: string;
  /** Max events to fetch */
  limit?: number;
  /** Custom relay URLs */
  relays?: string[];
  /** Comma-separated tag filters, e.g. "#i:osm:node:123,#g:u09tvw" */
  filterTags?: string;
  /** Tag filters object, e.g. { '#i': ['osm:node:123'] } */
  tagFilters?: Record<string, string[]>;
  /** Advanced: multiple REQ filter objects sent in a single subscription */
  filters?: FetchFilter[];
  /** Manifest for plugin-aware rendering */
  manifest?: import('@nostr-post/core/types').NostrPostManifest;
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
      ids,
      authors,
      kinds = [1],
      since,
      until,
      search,
      limit = 20,
      relays,
      filterTags,
      tagFilters,
      filters,
      manifest,
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
      if (ids) {
        element.ids = ids;
      } else {
        element.ids = undefined;
      }
      if (authors) {
        element.authors = authors;
      } else {
        element.authors = undefined;
      }
      element.kinds = kinds;
      element.since = since;
      element.until = until;
      element.search = search;
      element.limit = limit;
      if (relays) {
        element.relays = relays;
      } else {
        element.relays = undefined;
      }
      element.tagFilters = tagFilters;
      element.filters = filters;
      element.manifest = manifest;
      element.showKind = showKind;
      element.showTags = showTags;
    }, [
      ids,
      authors,
      kinds,
      since,
      until,
      search,
      limit,
      relays,
      tagFilters,
      filters,
      manifest,
      showKind,
      showTags,
    ]);

    // Don't pass authors/kinds/relays as attributes since we're setting them as properties
    // This prevents conflicts and re-renders
    return (
      <div className={wrapperClassName}>
        <nostr-post-feed
          ref={elementRef as React.RefObject<HTMLElement>}
          className={className}
          filter-tags={filterTags}
          show-kind={showKind}
          show-tags={showTags}
        />
      </div>
    );
  }
);
