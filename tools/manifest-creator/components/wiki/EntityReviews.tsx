'use client';

import { useEffect, useState } from 'react';
import { styles } from './wikiPanelStyles';

interface ReviewEvent {
  id: string;
  pubkey: string;
  kind: number;
  content: string;
  created_at: number;
  tags: string[][];
}

/**
 * Two-hop lookup: resolve every published version of the entity, then fetch
 * events that cite any of those versions via an `a` tag.
 */
async function fetchEntityReviews(slug: string): Promise<ReviewEvent[]> {
  const [
    { fetchEvents },
    { collectEntityATags, fetchEntityVersions, DEFAULT_WIKI_RELAYS, WIKI_KIND },
  ] = await Promise.all([import('@nostr-post/signer'), import('@nostr-post/wiki')]);
  const aTags = collectEntityATags(await fetchEntityVersions(slug));
  if (aTags.length === 0) return [];
  // Reviews can be any kind the review manifest targets, so don't filter by
  // kind on the relay; only drop other wiki versions that cite this entity.
  const found = (await fetchEvents(
    { '#a': aTags, limit: 50 } as never,
    DEFAULT_WIKI_RELAYS
  )) as unknown as ReviewEvent[];
  return found.filter((ev) => ev.kind !== WIKI_KIND);
}

/** Events (e.g. reviews) that reference any version of the entity. */
export function EntityReviews({ dTag }: { dTag: string }) {
  const [reviews, setReviews] = useState<ReviewEvent[]>();

  useEffect(() => {
    let cancelled = false;
    setReviews(undefined);
    fetchEntityReviews(dTag)
      .catch((): ReviewEvent[] => [])
      .then((found) => {
        if (!cancelled) setReviews(found);
      });
    return () => {
      cancelled = true;
    };
  }, [dTag]);

  if (!reviews) return <p style={styles.status}>Querying relays…</p>;
  if (reviews.length === 0) {
    return <div style={styles.infoBox}>No reviews found for “{dTag}” yet.</div>;
  }
  return (
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
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
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
  );
}
