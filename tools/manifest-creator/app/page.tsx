'use client';

import { resolveManifest } from '@nostr-post/core/manifest';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { useEffect, useRef, useState } from 'react';
import { ManifestEditor } from '../components/ManifestEditor';
import { ManifestNostrPanel } from '../components/ManifestNostrPanel';
import { PreviewPane } from '../components/PreviewPane';
import { EXAMPLE_MANIFESTS } from '../lib/examples';

const styles = {
  header: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '1.5rem 2rem',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: '#8b5cf6',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    color: '#6b7280',
    margin: 0,
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
  },
} as const;

async function fetchParentManifests(
  refs: string[],
  signal: AbortSignal
): Promise<NostrPostManifest[]> {
  const { fetchManifestByATag } = await import('@nostr-post/signer');
  if (signal.aborted) return [];
  const results = await Promise.all(refs.map((ref) => fetchManifestByATag(ref)));
  if (signal.aborted) return [];
  return results.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => p.manifest);
}

function mergeWithParents(
  manifest: NostrPostManifest,
  parents: NostrPostManifest[]
): NostrPostManifest {
  if (parents.length === 0) return manifest;
  const base = parents.slice(1).reduce((acc, cur) => resolveManifest(cur, acc), parents[0]);
  return resolveManifest(manifest, base);
}

export default function Home() {
  const [manifest, setManifest] = useState<NostrPostManifest>(EXAMPLE_MANIFESTS.simple);
  const [fetchedParents, setFetchedParents] = useState<NostrPostManifest[]>([]);
  const [resolvedManifest, setResolvedManifest] = useState<NostrPostManifest>(manifest);
  const [isResolvingParents, setIsResolvingParents] = useState(false);
  /** The `a` tag reference to the currently active manifest on Nostr */
  const [manifestRef, setManifestRef] = useState<string | undefined>();
  const resolveAbortRef = useRef<AbortController | null>(null);

  // Stable string key for the extends refs — only changes when the actual parent
  // references change, not on every unrelated manifest field edit.
  const extendsKey = Array.isArray(manifest.extends)
    ? manifest.extends.join('\n')
    : (manifest.extends ?? '');

  // Effect 1: fetch parents from relays only when the extends refs change.
  useEffect(() => {
    if (!extendsKey) {
      resolveAbortRef.current?.abort();
      resolveAbortRef.current = null;
      setIsResolvingParents(false);
      setFetchedParents([]);
      return;
    }

    resolveAbortRef.current?.abort();
    const controller = new AbortController();
    resolveAbortRef.current = controller;
    setIsResolvingParents(true);

    const refs = extendsKey.split('\n');
    fetchParentManifests(refs, controller.signal)
      .then((parents) => {
        if (!controller.signal.aborted) {
          setFetchedParents(parents);
          setIsResolvingParents(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('[manifest-creator] Could not resolve parent manifests:', err);
          setFetchedParents([]);
          setIsResolvingParents(false);
        }
      });

    return () => controller.abort();
  }, [extendsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: recompute the resolved manifest locally whenever manifest fields or
  // the already-fetched parents change — no relay calls here.
  useEffect(() => {
    setResolvedManifest(mergeWithParents(manifest, fetchedParents));
  }, [manifest, fetchedParents]);

  return (
    <>
      <header style={styles.header}>
        <h1 style={styles.title}>🎨 Manifest Creator</h1>
        <p style={styles.subtitle}>Visual tool for creating and testing nostr-post manifests</p>
      </header>

      <div style={styles.container}>
        <div style={styles.grid}>
          <div>
            <ManifestEditor manifest={manifest} onChange={setManifest} />
            <ManifestNostrPanel
              manifest={manifest}
              onChange={setManifest}
              onManifestRef={setManifestRef}
            />
          </div>
          <PreviewPane
            manifest={resolvedManifest}
            manifestRef={manifestRef}
            isResolvingParents={isResolvingParents}
          />
        </div>
      </div>
    </>
  );
}
