'use client';

import {
  NIP78_KIND,
  buildManifestATag,
  eventToManifest,
  manifestDeleteEvent,
  manifestToEvent,
} from '@nostr-post/core/nip78';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { NostrPostFeed } from '@nostr-post/react';
import type { SignedEvent } from '@nostr-post/web';
import { useCallback, useEffect, useState } from 'react';
import { styles } from './ManifestNostrPanelStyles';

interface ManifestNostrPanelProps {
  manifest: NostrPostManifest;
  onChange: (manifest: NostrPostManifest) => void;
  /** Called when a manifest is published, providing its `a` tag ref */
  onManifestRef?: (ref: string | undefined) => void;
}

type StatusMessage = { type: 'success' | 'error'; text: string } | null;
type PanelTab = 'publish' | 'my' | 'browse';

const StatusBanner = ({ status }: { status: StatusMessage }) => {
  if (!status) return null;
  return (
    <div style={status.type === 'success' ? styles.statusSuccess : styles.statusError}>
      {status.text}
    </div>
  );
};

interface PublishTabProps {
  currentPubkey?: string;
  isPublishing: boolean;
  manifest: NostrPostManifest;
  onDelete: () => void;
  onPublish: () => void;
  status: StatusMessage;
}

const PublishTab = ({
  currentPubkey,
  isPublishing,
  manifest,
  onDelete,
  onPublish,
  status,
}: PublishTabProps) => (
  <div>
    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
      Publish the current manifest to Nostr relays as a kind {NIP78_KIND} event. Anyone can discover
      and use it.
    </p>
    <div style={styles.buttonGroup}>
      <button
        type="button"
        style={styles.publishButton}
        onClick={onPublish}
        disabled={isPublishing}
      >
        {isPublishing ? 'Publishing...' : '🚀 Publish Manifest'}
      </button>
      <button type="button" style={styles.deleteButton} onClick={onDelete} disabled={isPublishing}>
        🗑️ Delete from Relays
      </button>
    </div>
    <StatusBanner status={status} />
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
);

interface ManifestFeedTabProps {
  description: string;
  authors?: string[];
  editable?: boolean;
  onEditRequest: (event: SignedEvent) => void;
}

/**
 * Uses <NostrPostFeed> to show published manifests. The feed deduplicates
 * stale addressable events (same pubkey + d-tag) automatically via core's
 * filterLatestAddressableEvents used inside buildThreads.
 */
const ManifestFeedTab = ({
  description,
  authors,
  editable,
  onEditRequest,
}: ManifestFeedTabProps) => (
  <div>
    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>{description}</p>
    <NostrPostFeed
      authors={authors}
      kinds={[NIP78_KIND]}
      filterTags="#t:nostr-post"
      limit={50}
      commentsEnabled={false}
      reactionsEnabled={false}
      editable={editable}
      onEditRequest={(event) => onEditRequest(event)}
    />
  </div>
);

export function ManifestNostrPanel({ manifest, onChange, onManifestRef }: ManifestNostrPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('publish');
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentPubkey, setCurrentPubkey] = useState<string | undefined>();

  useEffect(() => {
    const getPubkey = async () => {
      try {
        const { getPublicKey } = await import('@nostr-post/signer');
        setCurrentPubkey(await getPublicKey());
      } catch {
        setCurrentPubkey(undefined);
      }
    };
    getPubkey();
  }, []);

  const showStatus = useCallback((type: 'success' | 'error', text: string) => {
    setStatus({ type, text });
    setTimeout(() => setStatus(null), 5000);
  }, []);

  const handleEditRequest = useCallback(
    (event: SignedEvent) => {
      const stored = eventToManifest(event);
      if (!stored) return;
      onChange(stored.manifest);
      onManifestRef?.(`${NIP78_KIND}:${stored.pubkey}:${stored.dTag}`);
      setActiveTab('publish');
      showStatus('success', `Loaded "${stored.manifest.metadata?.name || stored.manifest.id}"`);
    },
    [onChange, onManifestRef, showStatus]
  );

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
        onManifestRef?.(buildManifestATag(pubkey, manifest.id));
        showStatus('success', `Published to ${publishResults.success} relay(s)!`);
      } else {
        showStatus(
          'error',
          `Failed: ${publishResults.results
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
  }, [manifest, onManifestRef, showStatus]);

  const deleteManifest = useCallback(async () => {
    if (
      !confirm(`Delete manifest "${manifest.id}" from relays? This publishes an empty replacement.`)
    )
      return;
    setIsPublishing(true);
    try {
      const { signAndPublish, getPublicKey } = await import('@nostr-post/signer');
      const pubkey = await getPublicKey();
      const { publishResults } = await signAndPublish(manifestDeleteEvent(manifest.id, pubkey));
      if (publishResults.success > 0) {
        onManifestRef?.(undefined);
        showStatus('success', `Deleted from ${publishResults.success} relay(s)`);
      } else {
        showStatus('error', 'Failed to delete');
      }
    } catch (err) {
      showStatus('error', `Error: ${(err as Error).message}`);
    } finally {
      setIsPublishing(false);
    }
  }, [manifest, onManifestRef, showStatus]);

  const activeTabContent =
    activeTab === 'publish' ? (
      <PublishTab
        currentPubkey={currentPubkey}
        isPublishing={isPublishing}
        manifest={manifest}
        onDelete={deleteManifest}
        onPublish={publishManifest}
        status={status}
      />
    ) : activeTab === 'my' ? (
      <ManifestFeedTab
        description="Your published manifests. Click Edit on any card to load it into the editor."
        authors={currentPubkey ? [currentPubkey] : undefined}
        editable
        onEditRequest={handleEditRequest}
      />
    ) : (
      <ManifestFeedTab
        description="Manifests published by all users. Click Edit to load one into the editor."
        onEditRequest={handleEditRequest}
      />
    );

  return (
    <div style={styles.panel}>
      <h2 style={styles.panelTitle}>🌐 Nostr Manifests (NIP-78)</h2>
      <div style={styles.tabs}>
        {(['publish', 'my', 'browse'] as PanelTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            style={activeTab === tab ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'publish' ? 'Publish' : tab === 'my' ? 'My Manifests' : 'Browse All'}
          </button>
        ))}
      </div>
      {activeTabContent}
    </div>
  );
}
