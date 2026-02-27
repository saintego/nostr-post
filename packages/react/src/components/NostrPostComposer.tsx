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
  autoPublish?: boolean;
  relays?: string[];
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
  /** Relay URLs to publish to */
  relays?: string[];
  /** Auto-publish events (uses NIP-07 window.nostr) */
  autoPublish?: boolean;
  /** Called after successful publish */
  onPublished?: (events: SignedEvent[]) => void;
  /** Called on submit (before signing) */
  onSubmit?: (bundle: unknown) => void;
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
  relays,
  autoPublish = true,
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
    if (relays) {
      element.relays = relays;
    }
    element.autoPublish = autoPublish;
  }, [manifest, manifestRef, relays, autoPublish]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlePublished = (e: Event) => {
      const customEvent = e as CustomEvent<SignedEvent[]>;
      onPublished?.(customEvent.detail);
    };

    const handleSubmit = (e: Event) => {
      const customEvent = e as CustomEvent;
      onSubmit?.(customEvent.detail);
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
