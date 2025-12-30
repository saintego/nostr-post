'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import { NostrPostComposer, NostrPostFeed, NostrPostView } from '@nostr-post/react';
import type { SignedEvent } from '@nostr-post/react';
import React, { useState } from 'react';

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

  const handlePublished = (events: SignedEvent[]) => {
    console.log('Published events:', events);
    setPublishedEvents((prev) => [...events, ...prev]);
    alert(`Published ${events.length} event(s)!`);
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
          style={activeTab === 'json' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('json')}
        >
          JSON
        </button>
      </div>

      {activeTab === 'preview' ? (
        <div>
          <div style={styles.composerContainer}>
            <h3 style={styles.feedHeader}>Composer</h3>
            <NostrPostComposer
              manifest={manifest}
              onPublished={handlePublished}
              onError={(error) => {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
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
                  <NostrPostView event={event} showKind showTags />
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
