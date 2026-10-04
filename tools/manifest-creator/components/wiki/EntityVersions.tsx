'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import { entitySnippet } from '@nostr-post/plugin-wiki-entity';
import { type WikiEvent, defaultResolver, fetchEntityVersions } from '@nostr-post/wiki';
import { useEffect, useState } from 'react';
import { WikiView } from './WikiElements';
import { styles } from './wikiPanelStyles';

interface EntityVersionsProps {
  manifest: NostrPostManifest;
  dTag: string;
  /** Load this version into the editor */
  onEditFrom: (version: WikiEvent) => void;
}

/** Every published version of an entity; open one read-only or edit from it. */
export function EntityVersions({ manifest, dTag, onEditFrom }: EntityVersionsProps) {
  const [versions, setVersions] = useState<WikiEvent[]>();
  const [opened, setOpened] = useState<WikiEvent>();

  useEffect(() => {
    let cancelled = false;
    setVersions(undefined);
    setOpened(undefined);
    fetchEntityVersions(dTag)
      .catch((): WikiEvent[] => [])
      .then((found) => {
        if (!cancelled) setVersions(found);
      });
    return () => {
      cancelled = true;
    };
  }, [dTag]);

  if (!versions) return <p style={styles.status}>Loading versions…</p>;
  if (versions.length === 0) return <p style={styles.status}>No versions found.</p>;

  const shownId = defaultResolver(versions)?.id;

  return (
    <div>
      <p style={styles.sectionTitle}>{versions.length} version(s), newest first</p>
      <div style={{ ...styles.list, maxHeight: '280px', marginBottom: '1rem' }}>
        {versions.map((version) => {
          const title = version.tags.find((t) => t[0] === 'title')?.[1] ?? dTag;
          const snippet = entitySnippet(version.tags, version.content);
          return (
            <div key={version.id} style={styles.listItem(version.id === opened?.id)}>
              <div style={styles.itemMain}>
                <div style={styles.itemTitle}>
                  {title}
                  {version.id === shownId && (
                    <span style={{ ...styles.mono, marginLeft: '0.5rem', color: '#7c3aed' }}>
                      shown
                    </span>
                  )}
                </div>
                <div style={styles.itemMeta}>
                  <span style={styles.mono}>{version.pubkey.slice(0, 8)}…</span> ·{' '}
                  {new Date(version.created_at * 1000).toLocaleString()}
                  {snippet && ` · ${snippet}`}
                </div>
              </div>
              <button type="button" style={styles.smallButton} onClick={() => setOpened(version)}>
                Open
              </button>
              <button type="button" style={styles.smallButton} onClick={() => onEditFrom(version)}>
                Edit from this
              </button>
            </div>
          );
        })}
      </div>
      {opened && <WikiView manifest={manifest} event={opened} />}
    </div>
  );
}
