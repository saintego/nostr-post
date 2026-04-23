/**
 * @nostr-post/react - NostrPostComposer component
 *
 * React wrapper around the <nostr-post-composer> web component
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { SignedEvent } from '@nostr-post/web';
import '@nostr-post/web'; // Register web components
import { useEffect, useRef } from 'react';

// Extend HTMLElement for the web component
interface NostrPostComposerElement extends HTMLElement {
  manifest?: NostrPostManifest;
  manifestRef?: string;
  dTag?: string;
  autoPublish?: boolean;
  relays?: string[];
  excludeFields?: string[];
  readonlyFields?: string[];
  prefill?: Record<string, unknown>;
  replyToEventId?: string;
  replyToPubkey?: string;
  rootEventId?: string;
  rootPubkey?: string;
}

// Declare the custom element for TypeScript/JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-post-composer': React.DetailedHTMLProps<
        React.HTMLAttributes<NostrPostComposerElement>,
        NostrPostComposerElement
      > & {
        'auto-publish'?: boolean;
      };
    }
  }
}

export interface NostrPostComposerProps {
  /** Manifest defining the form fields (defaults to Kind 1 note) */
  manifest?: NostrPostManifest;
  /** Reference to the manifest on Nostr (a-tag value, e.g. '30078:<pubkey>:<d-tag>') */
  manifestRef?: string;
  /** Explicit d-tag for addressable events. Reuse it to update an existing editable post. */
  dTag?: string;
  /** Relay URLs to publish to */
  relays?: string[];
  /** Auto-publish events (uses NIP-07 window.nostr) */
  autoPublish?: boolean;
  /** Field IDs to completely exclude from the composer */
  excludeFields?: string[];
  /** Field IDs to show as read-only */
  readonlyFields?: string[];
  /** Pre-filled values keyed by field ID */
  prefill?: Record<string, unknown>;
  /** Parent event id for protocol-standard kind 1 replies/comments */
  replyToEventId?: string;
  /** Parent author pubkey for protocol-standard kind 1 replies/comments */
  replyToPubkey?: string;
  /** Optional root event id when replying inside an existing thread */
  rootEventId?: string;
  /** Optional root author pubkey when replying inside an existing thread */
  rootPubkey?: string;
  /** Called after successful publish */
  onPublished?: (events: SignedEvent[], dTag?: string) => void;
  /** Called on submit (before signing) */
  onSubmit?: (bundle: unknown, dTag?: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Custom class name */
  className?: string;
  /** Dark mode */
  dark?: boolean;
}

/**
 * Composer component for creating Nostr posts
 *
 * React wrapper around <nostr-post-composer> web component
 */
export function NostrPostComposer({
  manifest,
  manifestRef,
  dTag,
  relays,
  autoPublish = true,
  excludeFields,
  readonlyFields,
  prefill,
  replyToEventId,
  replyToPubkey,
  rootEventId,
  rootPubkey,
  onPublished,
  onSubmit,
  onError,
  className = '',
  dark,
}: NostrPostComposerProps) {
  const elementRef = useRef<NostrPostComposerElement>(null);

  // Build wrapper class for dark mode
  const wrapperClassName = dark ? 'dark' : '';

  // Set properties on the web component
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (manifest) {
      element.manifest = manifest;
    }
    element.manifestRef = manifestRef;
    element.dTag = dTag;
    if (relays) {
      element.relays = relays;
    }
    element.autoPublish = autoPublish;
    element.excludeFields = excludeFields;
    element.readonlyFields = readonlyFields;
    element.prefill = prefill;
    element.replyToEventId = replyToEventId;
    element.replyToPubkey = replyToPubkey;
    element.rootEventId = rootEventId;
    element.rootPubkey = rootPubkey;
  }, [
    manifest,
    manifestRef,
    dTag,
    relays,
    autoPublish,
    excludeFields,
    readonlyFields,
    prefill,
    replyToEventId,
    replyToPubkey,
    rootEventId,
    rootPubkey,
  ]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlePublished = (e: Event) => {
      const customEvent = e as CustomEvent<
        SignedEvent[] | { events: SignedEvent[]; dTag?: string }
      >;
      const detail = customEvent.detail;
      if (Array.isArray(detail)) {
        onPublished?.(detail);
        return;
      }
      onPublished?.(detail.events, detail.dTag);
    };

    const handleSubmit = (e: Event) => {
      const customEvent = e as CustomEvent<{ bundle: unknown; dTag?: string }>;
      onSubmit?.(customEvent.detail.bundle, customEvent.detail.dTag);
    };

    const handleError = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; error?: Error }>;
      const error = customEvent.detail.error || new Error(customEvent.detail.message);
      onError?.(error);
    };

    // Only listen to the full event names to avoid duplicates
    element.addEventListener('nostr-post-published', handlePublished);
    element.addEventListener('nostr-post-submit', handleSubmit);
    element.addEventListener('nostr-post-error', handleError);

    return () => {
      element.removeEventListener('nostr-post-published', handlePublished);
      element.removeEventListener('nostr-post-submit', handleSubmit);
      element.removeEventListener('nostr-post-error', handleError);
    };
  }, [onPublished, onSubmit, onError]);

  return (
    <div className={wrapperClassName}>
      <nostr-post-composer ref={elementRef as React.RefObject<HTMLElement>} className={className} />
    </div>
  );
}
