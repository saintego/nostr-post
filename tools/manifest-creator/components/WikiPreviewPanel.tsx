'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import { entityPrefill } from '@nostr-post/plugin-wiki-entity';
import type { WikiEvent } from '@nostr-post/wiki';
import { useCallback, useEffect, useState } from 'react';
import { registerEntityManifests } from '../lib/entityManifests';
import { EntityBrowser } from './wiki/EntityBrowser';
import { EntityEditor } from './wiki/EntityEditor';
import { EntityReviews } from './wiki/EntityReviews';
import { EntityVersions } from './wiki/EntityVersions';
import { WikiView } from './wiki/WikiElements';
import { styles } from './wiki/wikiPanelStyles';

interface WikiPreviewPanelProps {
  manifest: NostrPostManifest;
}

type Tab = 'view' | 'edit' | 'versions' | 'reviews';

const TAB_LABELS: Record<Tab, string> = {
  view: '🔍 View',
  edit: '✏️ Edit',
  versions: '🕘 Versions',
  reviews: '🔗 Reviews',
};

/** What the panel works on: an existing entity, or a new one being written */
type Target = { kind: 'entity'; dTag: string } | { kind: 'new'; prefill: Record<string, unknown> };

/**
 * Find an entity of this manifest's type, then view it, edit it (from the
 * newest or any older version), browse its versions or find its reviews.
 */
export function WikiPreviewPanel({ manifest }: WikiPreviewPanelProps) {
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [componentsError, setComponentsError] = useState(false);
  const [target, setTarget] = useState<Target>();
  const [tab, setTab] = useState<Tab>('view');
  /** Version the editor starts from; newest when unset */
  const [baseEvent, setBaseEvent] = useState<WikiEvent>();

  // Load wiki web components client-side
  useEffect(() => {
    Promise.all([import('@nostr-post/wiki/web'), import('@nostr-post/plugin-wiki-entity/web')])
      .then(() => setComponentsLoaded(true))
      .catch(() => setComponentsError(true));
  }, []);

  // Let entity pickers in the editor create entities with these manifests
  useEffect(() => {
    void registerEntityManifests(manifest);
  }, [manifest]);

  const selectEntity = (dTag: string) => {
    setTarget({ kind: 'entity', dTag });
    setBaseEvent(undefined);
  };

  // A taken name is handled by the composer, which asks for a distinct slug
  const startNew = (name: string) => {
    setTarget({ kind: 'new', prefill: name ? entityPrefill(manifest, name) : {} });
    setBaseEvent(undefined);
    setTab('edit');
  };

  const editFrom = (version: WikiEvent) => {
    setBaseEvent(version);
    setTab('edit');
  };

  // Show what was just published
  const onPublished = useCallback((published: string) => {
    setTarget({ kind: 'entity', dTag: published });
    setBaseEvent(undefined);
    setTab('view');
  }, []);

  const tabs: Tab[] =
    target?.kind === 'entity' ? ['view', 'edit', 'versions', 'reviews'] : ['edit'];
  const activeTab = tabs.includes(tab) ? tab : 'edit';
  const dTag = target?.kind === 'entity' ? target.dTag : undefined;

  return (
    <div style={styles.panel}>
      <EntityBrowser
        manifest={manifest}
        selectedDTag={dTag}
        onSelect={selectEntity}
        onNew={startNew}
      />

      {componentsError && (
        <div style={{ color: '#b91c1c', padding: '0.75rem 1.25rem', fontSize: '0.875rem' }}>
          Failed to load wiki components. Check that <code>@nostr-post/wiki</code> and{' '}
          <code>@nostr-post/plugin-wiki-entity</code> are installed.
        </div>
      )}

      {!target ? (
        <div style={styles.body}>
          <div style={styles.infoBox}>
            Search for an entity of this type to view, edit or review it, or use{' '}
            <strong>+ New</strong> to create one.
          </div>
        </div>
      ) : (
        <>
          <div style={styles.entityHeader}>
            <h3 style={styles.entityTitle}>{dTag ?? 'New entity'}</h3>
          </div>
          <div style={styles.tabs}>
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                style={styles.tab(activeTab === t)}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {componentsLoaded && (
            <div style={styles.body}>
              {activeTab === 'view' && dTag && <WikiView manifest={manifest} entityId={dTag} />}

              {activeTab === 'edit' && (
                <EntityEditor
                  key={dTag ?? 'new'}
                  manifest={manifest}
                  dTag={dTag}
                  baseEvent={baseEvent}
                  prefill={target.kind === 'new' ? target.prefill : undefined}
                  onUseNewest={() => setBaseEvent(undefined)}
                  onPublished={onPublished}
                />
              )}

              {activeTab === 'versions' && dTag && (
                <EntityVersions manifest={manifest} dTag={dTag} onEditFrom={editFrom} />
              )}

              {activeTab === 'reviews' && dTag && <EntityReviews dTag={dTag} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
