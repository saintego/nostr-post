'use client';

import { coordinateEvents } from '@nostr-post/core/coordinator';
import { parseManifestATag } from '@nostr-post/core/nip78';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import type { SignedEvent } from '@nostr-post/react';
import { NostrPostView } from '@nostr-post/react';

import { useCallback, useEffect, useRef, useState } from 'react';

interface NostrPostComposerElement extends HTMLElement {
  manifest: NostrPostManifest;
  manifestRef?: string;
}

interface PreviewPaneProps {
  manifest: NostrPostManifest;
  /** Optional `a` tag value referencing a manifest on Nostr */
  manifestRef?: string;
}

const STORAGE_KEY = 'nostr-post-manifest-creator-events';

const loadCachedEvents = (): SignedEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const cacheEvents = (events: SignedEvent[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore storage errors
  }
};

const styles = {
  panel: {
    background: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    padding: '1.5rem',
  },
  panelHeader: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  panelTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    padding: '0.5rem 1rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontWeight: 500,
    color: '#6b7280',
  },
  activeTab: {
    padding: '0.5rem 1rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #8b5cf6',
    cursor: 'pointer',
    fontWeight: 500,
    color: '#8b5cf6',
  },
  codeBlock: {
    background: '#1f2937',
    color: '#e5e7eb',
    padding: '1rem',
    borderRadius: '0.375rem',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    overflowX: 'auto' as const,
    maxHeight: '600px',
    overflowY: 'auto' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  composerContainer: {
    maxHeight: '600px',
    overflowY: 'auto' as const,
  },
  divider: {
    borderTop: '2px solid #e5e7eb',
    margin: '1.5rem 0',
    padding: '1.5rem 0 0 0',
  },
  feedHeader: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: '#111827',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: '#6b7280',
  },
  clearButton: {
    padding: '0.375rem 0.75rem',
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#6b7280',
    marginLeft: '0.5rem',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hidden: {
    display: 'none',
  },
  eventPreviewLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginBottom: '0.5rem',
    fontStyle: 'italic' as const,
  },
} as const;

/**
 * Group flat list of events into "posts" — a primary event + its linked events.
 * Linked events have an `e` tag referencing the primary event (with marker "root").
 * Events without links are treated as standalone primary events.
 */
const groupEventPosts = (
  events: SignedEvent[]
): { primary: SignedEvent; linked: SignedEvent[] }[] => {
  const primaryIds = new Set<string>();
  const linkedByPrimary = new Map<string, SignedEvent[]>();
  const primaries: SignedEvent[] = [];

  // First pass: identify linked events (have an `e` tag with "root" marker)
  for (const event of events) {
    const rootTag = event.tags.find((t) => t[0] === 'e' && t.length >= 4 && t[3] === 'root');
    if (rootTag) {
      const primaryId = rootTag[1];
      if (!linkedByPrimary.has(primaryId)) {
        linkedByPrimary.set(primaryId, []);
      }
      const arr = linkedByPrimary.get(primaryId);
      if (arr) {
        arr.push(event);
      }
    }
  }

  // Second pass: collect primary events (not linked to anything)
  for (const event of events) {
    const isLinked = event.tags.some((t) => t[0] === 'e' && t.length >= 4 && t[3] === 'root');
    if (!isLinked && !primaryIds.has(event.id)) {
      primaryIds.add(event.id);
      primaries.push(event);
    }
  }

  return primaries.map((primary) => ({
    primary,
    linked: linkedByPrimary.get(primary.id) ?? [],
  }));
};

/**
 * Check if an event has an `a` tag that references a nostr-post manifest.
 * When present, the view component can auto-fetch the manifest from relays.
 */
const hasManifestATag = (event: SignedEvent): boolean => {
  return event.tags.some((t) => t[0] === 'a' && parseManifestATag(t[1]) !== undefined);
};

export const PreviewPane = ({ manifest, manifestRef }: PreviewPaneProps) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'events'>('preview');
  const [publishedEvents, setPublishedEvents] = useState<SignedEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [liveEventJson, setLiveEventJson] = useState<string>('');
  const composerRef = useRef<NostrPostComposerElement>(null);

  // Dynamically import web components and plugins (client-only, avoids SSR "window is not defined")
  useEffect(() => {
    import('@nostr-post/web');
    import('@nostr-post/plugin-stars/web');
    import('@nostr-post/plugin-geo/web');
    import('@nostr-post/plugin-media/web');
    import('@nostr-post/plugin-markdown/web');
    import('@nostr-post/plugin-hashtag/web');
    import('@nostr-post/plugin-venue/web');
  }, []);

  // Load events: show cache immediately, then fetch from relays
  useEffect(() => {
    // Show cached events first for instant display
    const cached = loadCachedEvents();
    if (cached.length > 0) {
      setPublishedEvents(cached);
    }

    // Then fetch from Nostr relays
    const loadFromRelays = async () => {
      try {
        const { getPublicKey, fetchEvents } = await import('@nostr-post/signer');

        // Try to get logged-in user's pubkey
        let pubkey: string | undefined;
        try {
          pubkey = await getPublicKey();
        } catch {
          // Not logged in — that's fine, skip relay load
          return;
        }

        if (!pubkey) return;

        setIsLoadingEvents(true);
        const kinds = manifest.requiredKinds ?? [1];
        const events = await fetchEvents({ authors: [pubkey], kinds, limit: 20 });

        if (events.length > 0) {
          setPublishedEvents(events);
          cacheEvents(events);
        }
      } catch (err) {
        console.warn('Failed to load events from relays:', err);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadFromRelays();
  }, [manifest.requiredKinds]);

  // Cache events to localStorage whenever they change
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
        setLiveEventJson(JSON.stringify(result.data.events, null, 2));
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
      Array.isArray(eventDetail.events)
    ) {
      events = eventDetail.events;
    } else {
      console.error('Unexpected event detail format:', eventDetail);
      return;
    }

    // Store the entire group of events together as a "post"
    // The first event is the primary, the rest are linked
    setPublishedEvents((prev) => [...events, ...prev]);
  }, []);

  // Update manifest and manifestRef on the composer element
  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.manifest = manifest;
      composerRef.current.manifestRef = manifestRef;
    }
  }, [manifest, manifestRef]);

  // Add event listener for published events
  useEffect(() => {
    const composer = composerRef.current;
    if (composer) {
      const handlePublishedEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        handlePublished(customEvent.detail);
      };

      composer.addEventListener('nostr-post-published', handlePublishedEvent);
      return () => {
        composer.removeEventListener('nostr-post-published', handlePublishedEvent);
      };
    }
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
          <nostr-post-composer ref={composerRef} auto-publish />
        </div>

        <div style={styles.divider}>
          <div style={styles.headerRow}>
            <h3 style={styles.feedHeader}>Published Events</h3>
            {publishedEvents.length > 0 && (
              <button type="button" style={styles.clearButton} onClick={clearEvents}>
                Clear all
              </button>
            )}
          </div>
          {publishedEvents.length === 0 ? (
            <div style={styles.emptyState}>
              {isLoadingEvents ? (
                <p>Loading events from relays...</p>
              ) : (
                <p>No events yet. Publish one above or log in to load from relays.</p>
              )}
            </div>
          ) : (
            groupEventPosts(publishedEvents).map((post) => (
              <div key={post.primary.id} style={{ marginBottom: '0.75rem' }}>
                <NostrPostView
                  event={post.primary}
                  linkedEvents={post.linked}
                  manifest={hasManifestATag(post.primary) ? undefined : manifest}
                  showKind
                  showTags
                />
              </div>
            ))
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
