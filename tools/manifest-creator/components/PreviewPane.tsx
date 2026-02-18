'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { SignedEvent } from '@nostr-post/react';
import '@nostr-post/web'; // Import web components
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

// TypeScript declarations for web components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-post-composer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        'auto-publish'?: boolean;
        onError?: (event: CustomEvent) => void;
      };
      'nostr-post-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        event?: SignedEvent;
        'show-kind'?: boolean;
        'show-tags'?: boolean;
      };
    }
  }
}

interface NostrPostComposerElement extends HTMLElement {
  manifest: NostrPostManifest;
}

interface PreviewPaneProps {
  manifest: NostrPostManifest;
}

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
} as const;

export function PreviewPane({ manifest }: PreviewPaneProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'json'>('preview');
  const [publishedEvents, setPublishedEvents] = useState<SignedEvent[]>([]);
  const composerRef = useRef<NostrPostComposerElement>(null);

  const handlePublished = useCallback(
    (eventDetail: unknown) => {
      console.log('Published event detail:', eventDetail);

      // Handle different event detail formats
      let events: SignedEvent[] = [];
      if (Array.isArray(eventDetail)) {
        events = eventDetail;
      } else if (eventDetail && typeof eventDetail === 'object' && 'events' in eventDetail && Array.isArray(eventDetail.events)) {
        events = eventDetail.events;
      } else {
        console.error('Unexpected event detail format:', eventDetail);
        return;
      }

      console.log('Extracted events:', events);
      console.log('Current publishedEvents before:', publishedEvents);
      setPublishedEvents((prev) => {
        const newEvents = [...events, ...prev];
        console.log('New publishedEvents:', newEvents);
        return newEvents;
      });
      alert(`Published ${events.length} event(s)!`);
    },
    [publishedEvents]
  );

  // Update manifest when it changes
  useEffect(() => {
    if (composerRef.current && activeTab === 'preview') {
      composerRef.current.manifest = manifest;
    }
  }, [manifest, activeTab]);

  // Add event listener for published events
  useEffect(() => {
    const composer = composerRef.current;
    if (composer) {
      const handlePublishedEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        console.log('Received published event:', customEvent.detail);
        handlePublished(customEvent.detail);
      };

      // Only listen to the full event name
      composer.addEventListener('nostr-post-published', handlePublishedEvent);

      return () => {
        composer.removeEventListener('nostr-post-published', handlePublishedEvent);
      };
    }
  }, [handlePublished]);

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
          style={activeTab === 'json' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('json')}
        >
          JSON
        </button>
      </div>

      {activeTab === 'preview' ? (
        <div key="preview-content">
          <div style={styles.composerContainer}>
            <h3 style={styles.feedHeader}>Composer</h3>
            <nostr-post-composer
              ref={composerRef}
              auto-publish
              onError={(e) => {
                console.error('Error:', (e as CustomEvent).detail);
                alert(`Error: ${(e as CustomEvent).detail.message}`);
              }}
            />
          </div>

          <div style={styles.divider}>
            <h3 style={styles.feedHeader}>Published Events Preview</h3>
            {publishedEvents.length === 0 ? (
              <div style={styles.emptyState}>
                <p>Publish an event above to see a preview here</p>
              </div>
            ) : (
              publishedEvents.map((event) => (
                <div key={event.id}>
                  <nostr-post-view event={event} show-kind show-tags />
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <pre style={styles.codeBlock}>{JSON.stringify(manifest, null, 2)}</pre>
      )}
    </div>
  );
}
