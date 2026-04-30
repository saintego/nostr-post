import type { NostrPostManifest } from '@nostr-post/core/types';
import { useEffect, useRef } from 'react';
import '@nostr-post/wiki/web';
import type { WikiResolverFunction } from '@nostr-post/wiki';

interface NostrWikiViewElement extends HTMLElement {
  manifest?: NostrPostManifest;
  resolver?: WikiResolverFunction;
  relays?: string[];
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-wiki-view': React.DetailedHTMLProps<
        React.HTMLAttributes<NostrWikiViewElement>,
        NostrWikiViewElement
      > & {
        'entity-id'?: string;
        'entity-i-id'?: string;
      };
    }
  }
}

export interface WikiViewProps {
  entityId?: string;
  entityIId?: string;
  manifest?: NostrPostManifest;
  resolver?: WikiResolverFunction;
  relays?: string[];
  className?: string;
}

export function WikiView({
  entityId,
  entityIId,
  manifest,
  resolver,
  relays,
  className,
}: WikiViewProps) {
  const ref = useRef<NostrWikiViewElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (manifest !== undefined) el.manifest = manifest;
    if (resolver !== undefined) el.resolver = resolver;
    if (relays !== undefined) el.relays = relays;
  }, [manifest, resolver, relays]);

  return (
    <nostr-wiki-view ref={ref} className={className} entity-id={entityId} entity-i-id={entityIId} />
  );
}
