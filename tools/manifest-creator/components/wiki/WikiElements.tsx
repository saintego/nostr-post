'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { WikiEvent } from '@nostr-post/wiki';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { useEffect, useRef } from 'react';

interface NostrWikiViewElement extends HTMLElement {
  manifest?: NostrPostManifest;
  entityId?: string;
  event?: WikiEvent;
}

interface NostrWikiComposerElement extends HTMLElement {
  manifest?: NostrPostManifest;
  entityId?: string;
  baseEvent?: WikiEvent;
  prefill?: Record<string, unknown>;
  autoPublish?: boolean;
  manifestRef?: string;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-wiki-view': DetailedHTMLProps<
        HTMLAttributes<NostrWikiViewElement>,
        NostrWikiViewElement
      >;
      'nostr-wiki-composer': DetailedHTMLProps<
        HTMLAttributes<NostrWikiComposerElement>,
        NostrWikiComposerElement
      >;
    }
  }
}

interface WikiViewProps {
  manifest: NostrPostManifest;
  /** Entity to fetch and resolve */
  entityId?: string;
  /** A specific version to show instead */
  event?: WikiEvent;
}

/** <nostr-wiki-view> with its properties set from React */
export function WikiView({ manifest, entityId, event }: WikiViewProps) {
  const ref = useRef<NostrWikiViewElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.manifest = manifest;
    el.event = event;
    el.entityId = entityId;
  }, [manifest, entityId, event]);
  return <nostr-wiki-view ref={ref} />;
}

/** detail of nostr-wiki-submit / nostr-wiki-published */
export interface WikiComposerDetail {
  /** The unsigned event */
  event: unknown;
  dTag?: string;
  /** nostr-wiki-published only: the signed event and where it went */
  results?: { signedEvent: unknown };
}

interface WikiComposerProps {
  manifest: NostrPostManifest;
  entityId?: string;
  baseEvent?: WikiEvent;
  prefill?: Record<string, unknown>;
  /** Sign and publish (NIP-07) instead of only handing over the unsigned event */
  autoPublish?: boolean;
  /** The published manifest's address: pages link it */
  manifestRef?: string;
  onSubmit?: (detail: WikiComposerDetail) => void;
  onPublished?: (detail: WikiComposerDetail) => void;
}

/** <nostr-wiki-composer> with its properties and events wired from React */
export function WikiComposer({
  manifest,
  entityId,
  baseEvent,
  prefill,
  autoPublish,
  manifestRef,
  onSubmit,
  onPublished,
}: WikiComposerProps) {
  const ref = useRef<NostrWikiComposerElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.manifest = manifest;
    el.prefill = prefill;
    el.baseEvent = baseEvent;
    el.entityId = entityId;
    el.autoPublish = autoPublish;
    el.manifestRef = manifestRef;
  }, [manifest, entityId, baseEvent, prefill, autoPublish, manifestRef]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const submit = (e: Event) => onSubmit?.((e as CustomEvent<WikiComposerDetail>).detail);
    const published = (e: Event) => onPublished?.((e as CustomEvent<WikiComposerDetail>).detail);
    el.addEventListener('nostr-wiki-submit', submit);
    el.addEventListener('nostr-wiki-published', published);
    return () => {
      el.removeEventListener('nostr-wiki-submit', submit);
      el.removeEventListener('nostr-wiki-published', published);
    };
  }, [onSubmit, onPublished]);

  return <nostr-wiki-composer ref={ref} />;
}
