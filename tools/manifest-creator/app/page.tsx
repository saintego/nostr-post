'use client';

import { useState } from 'react';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { ManifestEditor } from '../components/ManifestEditor';
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

export default function Home() {
  const [manifest, setManifest] = useState<NostrPostManifest>(EXAMPLE_MANIFESTS.simple);

  return (
    <>
      <header style={styles.header}>
        <h1 style={styles.title}>🎨 Manifest Creator</h1>
        <p style={styles.subtitle}>
          Visual tool for creating and testing nostr-post manifests
        </p>
      </header>

      <div style={styles.container}>
        <div style={styles.grid}>
          <ManifestEditor manifest={manifest} onChange={setManifest} />
          <PreviewPane manifest={manifest} />
        </div>
      </div>
    </>
  );
}