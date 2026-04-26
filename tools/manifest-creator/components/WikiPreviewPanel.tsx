'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import { useEffect, useRef, useState } from 'react';

interface WikiPreviewPanelProps {
  manifest: NostrPostManifest;
}

interface NostrWikiViewElement extends HTMLElement {
  manifest?: NostrPostManifest;
  relays?: string[];
  entityId?: string;
}

interface NostrWikiComposerElement extends HTMLElement {
  manifest?: NostrPostManifest;
  relays?: string[];
  entityId?: string;
  autoPublish?: boolean;
}

const styles = {
  panel: {
    background: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: (active: boolean): React.CSSProperties => ({
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 400,
    color: active ? '#7c3aed' : '#6b7280',
    borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    marginBottom: '-1px',
  }),
  body: {
    padding: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '0.375rem',
  },
  row: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  button: {
    padding: '0.45rem 0.9rem',
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: 500,
    flexShrink: 0,
  },
  infoBox: {
    background: '#f5f3ff',
    border: '1px solid #ddd6fe',
    borderRadius: '0.375rem',
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    color: '#5b21b6',
    marginBottom: '1rem',
  },
  eventCard: {
    background: '#1f2937',
    borderRadius: '0.375rem',
    padding: '1rem',
    marginTop: '0.75rem',
  },
  eventJson: {
    color: '#d1fae5',
    fontFamily: "'Monaco', 'Courier New', monospace",
    fontSize: '0.72rem',
    whiteSpace: 'pre-wrap' as const,
    margin: 0,
    overflowX: 'auto' as const,
  },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#9ca3af',
    marginBottom: '0.5rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
} as const;

type Tab = 'view' | 'compose' | 'twoHop';

interface ReviewEvent {
  id: string;
  pubkey: string;
  kind: number;
  content: string;
  created_at: number;
  tags: string[][];
}

export function WikiPreviewPanel({ manifest }: WikiPreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('view');
  const [entityId, setEntityId] = useState('');
  const [committedEntityId, setCommittedEntityId] = useState('');
  const [pendingEvent, setPendingEvent] = useState<unknown>(null);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [componentsError, setComponentsError] = useState(false);
  const [reviews, setReviews] = useState<ReviewEvent[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const viewRef = useRef<NostrWikiViewElement>(null);
  const composerRef = useRef<NostrWikiComposerElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load wiki web components client-side, then sync manifest once elements are defined.
  useEffect(() => {
    Promise.all([import('@nostr-post/wiki/web'), import('@nostr-post/plugin-wiki-entity/web')])
      .then(() => setComponentsLoaded(true))
      .catch(() => setComponentsError(true));
  }, []);

  // Sync manifest onto both web components — runs after load and on every manifest change.
  useEffect(() => {
    if (!componentsLoaded) return;
    if (viewRef.current) viewRef.current.manifest = manifest;
    if (composerRef.current) composerRef.current.manifest = manifest;
  }, [componentsLoaded, manifest, activeTab]);

  // Sync committed entity ID onto both web components
  useEffect(() => {
    if (!componentsLoaded) return;
    if (viewRef.current) viewRef.current.entityId = committedEntityId || undefined;
    if (composerRef.current) composerRef.current.entityId = committedEntityId || undefined;
  }, [componentsLoaded, committedEntityId, activeTab]);

  // Handle wiki-entity-create events bubbling up from picker (composed:true crosses shadow DOM).
  // Switch to Compose tab and pre-fill the slug so the user can create the missing entity.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const query = (e as CustomEvent<{ query: string }>).detail?.query ?? '';
      // Use the same normalization as the composer / nip54 so the slug is valid.
      const slug = query
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
      setEntityId(slug);
      setCommittedEntityId(slug);
      setActiveTab('compose');
    };
    el.addEventListener('wiki-entity-create', handler);
    return () => el.removeEventListener('wiki-entity-create', handler);
  }, []);

  // Fetch reviews when Find Reviews tab is active with a committed entity slug.
  useEffect(() => {
    if (activeTab !== 'twoHop' || !committedEntityId) {
      setReviews([]);
      return;
    }
    setReviewsLoading(true);
    void (async () => {
      try {
        const [{ fetchEvents }, { collectEntityATags, DEFAULT_WIKI_RELAYS, WIKI_KIND }] =
          await Promise.all([import('@nostr-post/signer'), import('@nostr-post/wiki')]);
        const entities = await fetchEvents(
          { kinds: [WIKI_KIND], '#d': [committedEntityId] } as never,
          DEFAULT_WIKI_RELAYS
        );
        const aTags = collectEntityATags(entities as never);
        if (aTags.length === 0) {
          setReviews([]);
          return;
        }
        const found = await fetchEvents(
          { '#a': aTags, kinds: [1, 30078], limit: 50 } as never,
          DEFAULT_WIKI_RELAYS
        );
        setReviews(found as unknown as ReviewEvent[]);
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    })();
  }, [activeTab, committedEntityId]);

  // Listen for composer events
  useEffect(() => {
    const el = composerRef.current;
    if (!el || !componentsLoaded) return;

    const onSubmit = (e: Event) => setPendingEvent((e as CustomEvent).detail.event);
    const onPublished = (e: Event) => setPendingEvent((e as CustomEvent).detail.event);
    el.addEventListener('nostr-wiki-submit', onSubmit);
    el.addEventListener('nostr-wiki-published', onPublished);
    return () => {
      el.removeEventListener('nostr-wiki-submit', onSubmit);
      el.removeEventListener('nostr-wiki-published', onPublished);
    };
  }, [componentsLoaded]);

  const commitEntityId = () => {
    setCommittedEntityId(entityId.trim());
    if (entityId.trim()) setActiveTab('view');
  };

  return (
    <div ref={panelRef} style={styles.panel}>
      {/* Tabs */}
      <div style={styles.tabs}>
        {(['view', 'compose', 'twoHop'] as Tab[]).map((tab) => (
          <button key={tab} style={styles.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'view' ? '🔍 View' : tab === 'compose' ? '✏️ Compose' : '🔗 Find reviews'}
          </button>
        ))}
      </div>

      <div style={styles.body}>
        {componentsError && (
          <div style={{ color: '#b91c1c', padding: '0.75rem', fontSize: '0.875rem' }}>
            Failed to load wiki components. Check that <code>@nostr-post/wiki</code> and{' '}
            <code>@nostr-post/plugin-wiki-entity</code> are installed.
          </div>
        )}

        {/* Entity ID picker — shared across tabs */}
        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label style={styles.label} htmlFor="wiki-entity-id">
              Entity d-tag (slug)
            </label>
            <input
              id="wiki-entity-id"
              style={styles.input}
              placeholder="e.g. pliny-the-elder"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitEntityId()}
            />
          </div>
          <button style={styles.button} onClick={commitEntityId}>
            Load
          </button>
        </div>

        {/* ── View tab ── */}
        {activeTab === 'view' && (
          <>
            <div style={styles.infoBox}>
              Queries{' '}
              <code>{'{"kinds":[30818],"#d":["' + (committedEntityId || '<slug>') + '"]}'}</code>{' '}
              across all pubkeys, resolves to the newest non-deferred event.
            </div>
            {/* Suppress TS unknown JSX element — dynamic import defines the element at runtime */}
            {/* @ts-ignore */}
            <nostr-wiki-view ref={viewRef} />
          </>
        )}

        {/* ── Compose tab ── */}
        {activeTab === 'compose' && (
          <>
            <div style={styles.infoBox}>
              Pre-fills from the resolved event (if entity d-tag is set). Publishes a new{' '}
              <code>kind:30818</code> event with the same d-tag — your fork is added to the pool.
            </div>
            {/* @ts-ignore */}
            <nostr-wiki-composer ref={composerRef} />

            {pendingEvent && (
              <div>
                <p style={styles.sectionTitle}>Unsigned event</p>
                <div style={styles.eventCard}>
                  <pre style={styles.eventJson}>{JSON.stringify(pendingEvent, null, 2)}</pre>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Find reviews tab ── */}
        {activeTab === 'twoHop' && (
          <>
            {!committedEntityId ? (
              <div style={styles.infoBox}>
                Enter an entity slug above and click <strong>Load</strong> to find reviews that
                reference it.
              </div>
            ) : reviewsLoading ? (
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Querying relays…</p>
            ) : reviews.length === 0 ? (
              <div style={styles.infoBox}>No reviews found for “{committedEntityId}” yet.</div>
            ) : (
              <>
                <p style={styles.sectionTitle}>{reviews.length} review(s) found</p>
                {reviews.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      marginBottom: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      padding: '0.75rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '0.4rem',
                        alignItems: 'center',
                      }}
                    >
                      <code style={{ color: '#6b7280' }}>{ev.pubkey.slice(0, 12)}…</code>
                      <span style={{ color: '#9ca3af' }}>·</span>
                      <span style={{ color: '#6b7280' }}>kind:{ev.kind}</span>
                      <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>
                        {new Date(ev.created_at * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#374151' }}>
                      {ev.content.slice(0, 200)}
                      {ev.content.length > 200 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
