import type { NostrPostManifest } from '@nostr-post/core/types';
import { useEffect, useRef } from 'react';
import '@nostr-post/wiki/web';
import type { WikiResolverFunction } from '@nostr-post/wiki';

interface NostrWikiComposerElement extends HTMLElement {
  manifest?: NostrPostManifest;
  resolver?: WikiResolverFunction;
  relays?: string[];
  autoPublish?: boolean;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-wiki-composer': React.DetailedHTMLProps<
        React.HTMLAttributes<NostrWikiComposerElement>,
        NostrWikiComposerElement
      > & {
        'entity-id'?: string;
        'auto-publish'?: boolean;
      };
    }
  }
}

export interface WikiComposerProps {
  entityId?: string;
  manifest?: NostrPostManifest;
  resolver?: WikiResolverFunction;
  relays?: string[];
  autoPublish?: boolean;
  onPublished?: (detail: { event: unknown; dTag: string }) => void;
  onSubmit?: (detail: { event: unknown; dTag: string }) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function WikiComposer({
  entityId,
  manifest,
  resolver,
  relays,
  autoPublish,
  onPublished,
  onSubmit,
  onError,
  className,
}: WikiComposerProps) {
  const ref = useRef<NostrWikiComposerElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (manifest !== undefined) el.manifest = manifest;
    if (resolver !== undefined) el.resolver = resolver;
    if (relays !== undefined) el.relays = relays;
    if (autoPublish !== undefined) el.autoPublish = autoPublish;
  }, [manifest, resolver, relays, autoPublish]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handlePublished = (e: Event) => onPublished?.((e as CustomEvent).detail);
    const handleSubmit = (e: Event) => onSubmit?.((e as CustomEvent).detail);
    const handleError = (e: Event) => {
      const error = (e as CustomEvent).detail?.error;
      onError?.(
        error instanceof Error
          ? error
          : new Error(typeof error === 'string' ? error : String(error))
      );
    };
    el.addEventListener('nostr-wiki-published', handlePublished);
    el.addEventListener('nostr-wiki-submit', handleSubmit);
    el.addEventListener('nostr-wiki-error', handleError);
    return () => {
      el.removeEventListener('nostr-wiki-published', handlePublished);
      el.removeEventListener('nostr-wiki-submit', handleSubmit);
      el.removeEventListener('nostr-wiki-error', handleError);
    };
  }, [onPublished, onSubmit, onError]);

  return (
    <nostr-wiki-composer
      ref={ref}
      className={className}
      entity-id={entityId}
      auto-publish={autoPublish}
    />
  );
}
