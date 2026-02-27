'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import { useCallback, useEffect, useState } from 'react';

import {
  MANIFEST_D_TAG_PREFIX,
  type ManifestRef,
  NIP78_KIND,
  type StoredManifest,
  buildManifestDTag,
  eventToManifest,
  manifestDeleteEvent,
  manifestToEvent,
} from '@nostr-post/core/nip78';

interface ManifestNostrPanelProps {
  manifest: NostrPostManifest;
  onChange: (manifest: NostrPostManifest) => void;
  /** Called when a manifest is published, providing its `a` tag ref */
  onManifestRef?: (ref: string | undefined) => void;
}

const styles = {
  panel: {
    background: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    padding: '1.5rem',
    marginTop: '1rem',
  },
  panelTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0 0 1rem 0',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 0.75rem 0',
    color: '#374151',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  publishButton: {
    padding: '0.5rem 1rem',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '0.5rem 1rem',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loadButton: {
    padding: '0.375rem 0.75rem',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
  statusSuccess: {
    padding: '0.5rem 0.75rem',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
  statusError: {
    padding: '0.5rem 0.75rem',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
  manifestCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    background: '#f9fafb',
  },
  manifestCardTitle: {
    fontWeight: 600,
    fontSize: '0.9375rem',
    margin: '0 0 0.25rem 0',
    color: '#1f2937',
  },
  manifestCardMeta: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    margin: '0 0 0.25rem 0',
  },
  manifestCardActions: {
    display: 'flex',
    gap: '0.375rem',
    marginTop: '0.5rem',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '1.5rem',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  tab: {
    padding: '0.375rem 0.75rem',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#6b7280',
  },
  activeTab: {
    padding: '0.375rem 0.75rem',
    background: '#8b5cf6',
    border: '1px solid #8b5cf6',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'white',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    marginBottom: '0.75rem',
  },
  pubkeyLabel: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
};

type StatusMessage = { type: 'success' | 'error'; text: string } | null;

export function ManifestNostrPanel({ manifest, onChange, onManifestRef }: ManifestNostrPanelProps) {
  const [activeTab, setActiveTab] = useState<'publish' | 'my' | 'browse'>('publish');
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [myManifests, setMyManifests] = useState<StoredManifest[]>([]);
  const [browseManifests, setBrowseManifests] = useState<StoredManifest[]>([]);
  const [currentPubkey, setCurrentPubkey] = useState<string | undefined>();

  // Try to get pubkey on mount
  useEffect(() => {
    const getPubkey = async () => {
      try {
        const { getPublicKey } = await import('@nostr-post/signer');
        const pk = await getPublicKey();
        setCurrentPubkey(pk);
      } catch {
        // Not logged in
      }
    };
    getPubkey();
  }, []);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatus({ type, text });
    setTimeout(() => setStatus(null), 5000);
  };

  /** Publish or update the current manifest on Nostr relays */
  const publishManifest = useCallback(async () => {
    setIsPublishing(true);
    setStatus(null);

    try {
      const { signAndPublish, getPublicKey } = await import('@nostr-post/signer');
      const pubkey = await getPublicKey();
      setCurrentPubkey(pubkey);

      const event = manifestToEvent(manifest, pubkey);
      const { publishResults } = await signAndPublish(event);

      if (publishResults.success > 0) {
        const dTag = buildManifestDTag(manifest.id);
        const aTag = `${NIP78_KIND}:${pubkey}:${dTag}`;
        onManifestRef?.(aTag);
        showStatus('success', `Published to ${publishResults.success} relay(s)!`);
        // Refresh my manifests
        loadMyManifests();
      } else {
        showStatus(
          'error',
          `Failed to publish: ${publishResults.results
            .map((r) => r.error)
            .filter(Boolean)
            .join(', ')}`
        );
      }
    } catch (err) {
      showStatus('error', `Error: ${(err as Error).message}`);
    } finally {
      setIsPublishing(false);
    }
  }, [manifest, onManifestRef]);

  /** Delete a manifest from relays */
  const deleteManifest = useCallback(
    async (manifestId: string) => {
      if (
        !confirm(
          `Delete manifest "${manifestId}" from relays? This publishes an empty replacement.`
        )
      )
        return;

      setIsPublishing(true);
      try {
        const { signAndPublish, getPublicKey } = await import('@nostr-post/signer');
        const pubkey = await getPublicKey();
        const event = manifestDeleteEvent(manifestId, pubkey);
        const { publishResults } = await signAndPublish(event);

        if (publishResults.success > 0) {
          showStatus('success', `Deleted from ${publishResults.success} relay(s)`);
          onManifestRef?.(undefined);
          loadMyManifests();
        } else {
          showStatus('error', 'Failed to delete');
        }
      } catch (err) {
        showStatus('error', `Error: ${(err as Error).message}`);
      } finally {
        setIsPublishing(false);
      }
    },
    [onManifestRef]
  );

  /** Load the current user's published manifests */
  const loadMyManifests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { fetchEvents, getPublicKey } = await import('@nostr-post/signer');
      const pubkey = await getPublicKey();
      setCurrentPubkey(pubkey);

      const events = await fetchEvents({
        kinds: [NIP78_KIND],
        authors: [pubkey],
        '#t': ['nostr-post'],
        limit: 50,
      });

      const manifests: StoredManifest[] = [];
      for (const ev of events) {
        const stored = eventToManifest(ev);
        if (stored) manifests.push(stored);
      }

      setMyManifests(manifests);
    } catch (err) {
      showStatus('error', `Failed to load: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Browse manifests from all users */
  const browseAllManifests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { fetchEvents } = await import('@nostr-post/signer');

      const events = await fetchEvents({
        kinds: [NIP78_KIND],
        '#t': ['nostr-post'],
        limit: 100,
      });

      const manifests: StoredManifest[] = [];
      for (const ev of events) {
        const stored = eventToManifest(ev);
        if (stored) manifests.push(stored);
      }

      setBrowseManifests(manifests);
    } catch (err) {
      showStatus('error', `Failed to browse: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load when switching tabs
  useEffect(() => {
    if (activeTab === 'my' && myManifests.length === 0) {
      loadMyManifests();
    } else if (activeTab === 'browse' && browseManifests.length === 0) {
      browseAllManifests();
    }
  }, [activeTab, myManifests.length, browseManifests.length, loadMyManifests, browseAllManifests]);

  const loadIntoEditor = (stored: StoredManifest) => {
    onChange(stored.manifest);
    onManifestRef?.(`${NIP78_KIND}:${stored.pubkey}:${stored.dTag}`);
    setActiveTab('publish');
    showStatus('success', `Loaded "${stored.manifest.metadata?.name || stored.manifest.id}"`);
  };

  const truncatePubkey = (pk: string) =>
    pk.length > 16 ? `${pk.slice(0, 8)}...${pk.slice(-8)}` : pk;

  const renderManifestCard = (stored: StoredManifest, showAuthor = false) => (
    <div key={`${stored.pubkey}-${stored.dTag}`} style={styles.manifestCard}>
      <p style={styles.manifestCardTitle}>{stored.manifest.metadata?.name || stored.manifest.id}</p>
      <p style={styles.manifestCardMeta}>
        {stored.manifest.metadata?.description || 'No description'}
      </p>
      <p style={styles.manifestCardMeta}>
        v{stored.manifest.version} &bull; {stored.manifest.fields.length} fields &bull; kinds:{' '}
        {stored.manifest.requiredKinds.join(', ')}
        {showAuthor && (
          <>
            {' '}
            &bull; <span style={styles.pubkeyLabel}>{truncatePubkey(stored.pubkey)}</span>
          </>
        )}
      </p>
      <p style={styles.manifestCardMeta}>{new Date(stored.createdAt * 1000).toLocaleString()}</p>
      <div style={styles.manifestCardActions}>
        <button type="button" style={styles.loadButton} onClick={() => loadIntoEditor(stored)}>
          Load into Editor
        </button>
        {stored.pubkey === currentPubkey && (
          <button
            type="button"
            style={{ ...styles.loadButton, color: '#ef4444', borderColor: '#fca5a5' }}
            onClick={() => deleteManifest(stored.manifest.id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.panel}>
      <h2 style={styles.panelTitle}>🌐 Nostr Manifests (NIP-78)</h2>

      <div style={styles.tabs}>
        <button
          type="button"
          style={activeTab === 'publish' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('publish')}
        >
          Publish
        </button>
        <button
          type="button"
          style={activeTab === 'my' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('my')}
        >
          My Manifests
        </button>
        <button
          type="button"
          style={activeTab === 'browse' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('browse')}
        >
          Browse All
        </button>
      </div>

      {/* Publish Tab */}
      {activeTab === 'publish' && (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
            Publish the current manifest to Nostr relays as a kind {NIP78_KIND} event. Anyone can
            discover and use it.
          </p>

          <div style={styles.buttonGroup}>
            <button
              type="button"
              style={styles.publishButton}
              onClick={publishManifest}
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : '🚀 Publish Manifest'}
            </button>
            <button
              type="button"
              style={styles.deleteButton}
              onClick={() => deleteManifest(manifest.id)}
              disabled={isPublishing}
            >
              🗑️ Delete from Relays
            </button>
          </div>

          {status && (
            <div style={status.type === 'success' ? styles.statusSuccess : styles.statusError}>
              {status.text}
            </div>
          )}

          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280' }}>
              Preview NIP-78 Event
            </summary>
            <pre
              style={{
                background: '#1f2937',
                color: '#e5e7eb',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                marginTop: '0.5rem',
                overflowX: 'auto',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {JSON.stringify(manifestToEvent(manifest, currentPubkey || '<pubkey>'), null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* My Manifests Tab */}
      {activeTab === 'my' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Your published manifests on Nostr relays.
            </p>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={loadMyManifests}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {isLoading && myManifests.length === 0 ? (
            <div style={styles.emptyState}>Loading your manifests...</div>
          ) : myManifests.length === 0 ? (
            <div style={styles.emptyState}>
              No manifests published yet. Go to the Publish tab to publish one.
            </div>
          ) : (
            myManifests.map((m) => renderManifestCard(m))
          )}
        </div>
      )}

      {/* Browse All Tab */}
      {activeTab === 'browse' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Discover manifests published by other users.
            </p>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={browseAllManifests}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {isLoading && browseManifests.length === 0 ? (
            <div style={styles.emptyState}>Searching relays for manifests...</div>
          ) : browseManifests.length === 0 ? (
            <div style={styles.emptyState}>
              No manifests found on relays. Be the first to publish one!
            </div>
          ) : (
            browseManifests.map((m) => renderManifestCard(m, true))
          )}
        </div>
      )}
    </div>
  );
}
