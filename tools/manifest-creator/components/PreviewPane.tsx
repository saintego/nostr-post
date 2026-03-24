'use client';

import { coordinateEvents } from '@nostr-post/core/coordinator';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { NostrPostFeed, type NostrPostFeedRef, type SignedEvent } from '@nostr-post/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cacheEvents, loadCachedEvents } from './previewPaneHelpers';
import { styles } from './previewPaneStyles';

interface NostrPostComposerElement extends HTMLElement {
  manifest: NostrPostManifest;
  manifestRef?: string;
}

interface PreviewPaneProps {
  manifest: NostrPostManifest;
  /** Optional `a` tag value referencing a manifest on Nostr */
  manifestRef?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const PreviewPane = ({ manifest, manifestRef }: PreviewPaneProps) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'events'>('preview');
  const [publishedEvents, setPublishedEvents] = useState<SignedEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [currentPubkey, setCurrentPubkey] = useState<string>('');
  const [liveEventJson, setLiveEventJson] = useState<string>('');
  const composerRef = useRef<NostrPostComposerElement>(null);
  const feedRef = useRef<NostrPostFeedRef>(null);

  // Dynamically import web components and plugins (client-only, avoids SSR issues)
  useEffect(() => {
    import('@nostr-post/web');
    import('@nostr-post/plugin-stars/web');
    import('@nostr-post/plugin-geo/web');
    import('@nostr-post/plugin-media/web');
    import('@nostr-post/plugin-markdown/web');
    import('@nostr-post/plugin-hashtag/web');
    import('@nostr-post/plugin-venue/web');
  }, []);

  const reloadCurrentPubkey = useCallback(async () => {
    try {
      const { getPublicKey, fetchEvents } = await import('@nostr-post/signer');
      let pubkey: string | undefined;
      try {
        pubkey = await getPublicKey();
      } catch {
        return;
      }
      if (!pubkey) return;

      setCurrentPubkey(pubkey);
      setIsLoadingEvents(true);

      const kinds = manifest.requiredKinds ?? [1];
      const events = await fetchEvents({ authors: [pubkey], kinds, limit: 20 });
      if (events.length > 0) {
        setPublishedEvents(events);
        cacheEvents(events);
      }
    } catch (err) {
      console.warn('Failed to reload signer/feed:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [manifest.requiredKinds]);

  // Load events: show cache immediately, then fetch from relays
  useEffect(() => {
    const cached = loadCachedEvents();
    if (cached.length > 0) setPublishedEvents(cached);

    void reloadCurrentPubkey();
  }, [reloadCurrentPubkey]);

  useEffect(() => {
    cacheEvents(publishedEvents);
  }, [publishedEvents]);

  // Listen to form changes on the composer for live event preview
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    const handleFormChange = (e: Event) => {
      const { formData: data } = (e as CustomEvent).detail;
      if (!data || Object.keys(data).length === 0) return;

      const result = coordinateEvents(manifest, data, {
        pubkey: '<pubkey>',
        createdAt: Math.floor(Date.now() / 1000),
        manifestRef,
        tagSerializer: (value, field) => {
          const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
          return plugin?.serializeValue?.(value, field);
        },
      });
      if (result.success) {
        const previewEvents = result.data.events as SignedEvent[];
        setLiveEventJson(JSON.stringify(previewEvents, null, 2));
      }
    };

    composer.addEventListener('nostr-post-form-change', handleFormChange);
    return () => composer.removeEventListener('nostr-post-form-change', handleFormChange);
  }, [manifest, manifestRef]);

  const handlePublished = useCallback((eventDetail: unknown) => {
    let events: SignedEvent[] = [];
    if (Array.isArray(eventDetail)) {
      events = eventDetail;
    } else if (
      eventDetail &&
      typeof eventDetail === 'object' &&
      'events' in eventDetail &&
      Array.isArray((eventDetail as { events: unknown }).events)
    ) {
      events = (eventDetail as { events: SignedEvent[] }).events;
    } else {
      console.error('Unexpected event detail format:', eventDetail);
      return;
    }
    setPublishedEvents((prev) => [...events, ...prev]);
    void feedRef.current?.refresh?.();
  }, []);

  // Sync manifest to composer element
  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.manifest = manifest;
      composerRef.current.manifestRef = manifestRef;
    }
  }, [manifest, manifestRef]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const handle = (e: Event) => handlePublished((e as CustomEvent).detail);
    composer.addEventListener('nostr-post-published', handle);
    return () => composer.removeEventListener('nostr-post-published', handle);
  }, [handlePublished]);

  const clearEvents = () => {
    setPublishedEvents([]);
    cacheEvents([]);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>Preview</h2>
        <p style={styles.subtitle}>Test your manifest in real-time</p>
      </div>

      <div style={styles.tabs}>
        <button
          type="button"
          style={activeTab === 'preview' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('preview')}
        >
          Live Preview
        </button>
        <button
          type="button"
          style={activeTab === 'events' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('events')}
        >
          Event JSON
        </button>
      </div>

      {/*
        Composer is ALWAYS rendered but hidden when not on the preview tab.
        This preserves its internal state (form values) across tab switches.
      */}
      <div style={activeTab !== 'preview' ? styles.hidden : undefined}>
        <div style={styles.composerContainer}>
          <h3 style={styles.feedHeader}>Composer</h3>
          <nostr-post-composer
            ref={composerRef}
            auto-publish
            show-reply-target
            editable-reply-target
          />
        </div>

        <div style={styles.divider}>
          <div style={styles.headerRow}>
            <h3 style={styles.feedHeader}>Feed</h3>
          </div>
          {!currentPubkey ? (
            <div style={styles.emptyState}>
              <p>Connect a signer to load your feed and enable comments/reactions.</p>
              <button
                type="button"
                onClick={() => void reloadCurrentPubkey()}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1.25rem',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Retry signer
              </button>
            </div>
          ) : isLoadingEvents ? (
            <div style={styles.emptyState}>
              <p>Loading events from relays...</p>
            </div>
          ) : (
            <NostrPostFeed
              ref={feedRef}
              authors={[currentPubkey]}
              kinds={manifest.requiredKinds ?? [1]}
              limit={20}
              manifest={manifest}
              commentsEnabled
              reactionsEnabled
              showKind
              showTags
            />
          )}
        </div>
      </div>

      {activeTab === 'events' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={styles.headerRow}>
              <h3 style={{ ...styles.feedHeader, marginBottom: '0.25rem' }}>Live Event Preview</h3>
            </div>
            <p style={styles.eventPreviewLabel}>
              Updates as you type in the composer — shows what the unsigned event will look like
            </p>
            {liveEventJson ? (
              <pre style={styles.codeBlock}>{liveEventJson}</pre>
            ) : (
              <div style={styles.emptyState}>
                <p>Start typing in the composer to see a live event preview</p>
              </div>
            )}
          </div>

          {publishedEvents.length > 0 && (
            <div>
              <div style={styles.headerRow}>
                <h3 style={styles.feedHeader}>Published Events ({publishedEvents.length})</h3>
                <button type="button" style={styles.clearButton} onClick={clearEvents}>
                  Clear all
                </button>
              </div>
              <pre style={styles.codeBlock}>{JSON.stringify(publishedEvents, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
