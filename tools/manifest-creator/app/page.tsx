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

async function fetchResolvedManifest(
  manifest: NostrPostManifest,
  signal: AbortSignal
): Promise<NostrPostManifest> {
  const refs = manifest.extends
    ? Array.isArray(manifest.extends)
      ? manifest.extends
      : [manifest.extends]
    : [];

  if (refs.length === 0) return manifest;

  const { fetchManifestByATag } = await import('@nostr-post/signer');
  if (signal.aborted) return manifest;

  const parentStoreds = await Promise.all(refs.map((ref) => fetchManifestByATag(ref)));
  if (signal.aborted) return manifest;

  const foundParents = parentStoreds
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map((p) => p.manifest);

  if (foundParents.length === 0) return manifest;

  const mergedParent = foundParents
    .slice(1)
    .reduce((base, current) => resolveManifest(current, base), foundParents[0]);

  return resolveManifest(manifest, mergedParent);
}

export default function Home() {
  const [manifest, setManifest] = useState<NostrPostManifest>(EXAMPLE_MANIFESTS.simple);
  const [resolvedManifest, setResolvedManifest] = useState<NostrPostManifest>(manifest);
  const [isResolvingParents, setIsResolvingParents] = useState(false);
  /** The `a` tag reference to the currently active manifest on Nostr */
  const [manifestRef, setManifestRef] = useState<string | undefined>();
  const resolveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!manifest.extends) {
      setResolvedManifest(manifest);
      return;
    }

    resolveAbortRef.current?.abort();
    const controller = new AbortController();
    resolveAbortRef.current = controller;
    setIsResolvingParents(true);

    fetchResolvedManifest(manifest, controller.signal)
      .then((resolved) => {
        if (!controller.signal.aborted) setResolvedManifest(resolved);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('[manifest-creator] Could not resolve parent manifests:', err);
          setResolvedManifest(manifest);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsResolvingParents(false);
      });

    return () => controller.abort();
  }, [manifest]);

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
