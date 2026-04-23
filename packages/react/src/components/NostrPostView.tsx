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
  manifest?: import('@nostr-post/core/types').NostrPostManifest;
  linkedEvents?: SignedEvent[];
  interactionEvents?: SignedEvent[];
  showKind?: boolean;
  showTags?: boolean;
  showId?: boolean;
  editable?: boolean;
  excludeFields?: string[];
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
  /** The primary event to display */
  event: SignedEvent;
  /** Manifest for plugin-aware rendering */
  manifest?: import('@nostr-post/core/types').NostrPostManifest;
  /** Linked events (e.g. NIP-78 data) that are part of this multi-event post */
  linkedEvents?: SignedEvent[];
  /** Interaction events (e.g. kind 1 update comments) related to the primary event */
  interactionEvents?: SignedEvent[];
  /** Show event kind badge */
  showKind?: boolean;
  /** Show tags */
  showTags?: boolean;
  /** Show event ID */
  showId?: boolean;
  /** Show Edit button for addressable events (kinds 30000-39999) */
  editable?: boolean;
  /** Called when the user clicks Edit on an addressable event */
  onEditRequest?: (event: SignedEvent, dTag: string | undefined) => void;
  /** Field IDs to exclude from the rendered view */
  excludeFields?: string[];
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
  manifest,
  linkedEvents,
  interactionEvents,
  showKind = false,
  showTags = false,
  showId = false,
  editable = false,
  onEditRequest,
  excludeFields,
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
    element.manifest = manifest;
    element.linkedEvents = linkedEvents;
    element.interactionEvents = interactionEvents;
    element.showKind = showKind;
    element.showTags = showTags;
    element.showId = showId;
    element.editable = editable;
    element.excludeFields = excludeFields;
  }, [
    event,
    manifest,
    linkedEvents,
    interactionEvents,
    showKind,
    showTags,
    showId,
    editable,
    excludeFields,
  ]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !onEditRequest) return;
    const handler = (e: Event) => {
      // Prevent the web component's built-in inline composer from opening,
      // since the caller is handling editing themselves.
      e.preventDefault();
      const detail = (e as CustomEvent<{ event: SignedEvent; dTag?: string }>).detail;
      onEditRequest(detail.event, detail.dTag);
    };
    element.addEventListener('nostr-post-edit-request', handler);
    return () => element.removeEventListener('nostr-post-edit-request', handler);
  }, [onEditRequest]);

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
