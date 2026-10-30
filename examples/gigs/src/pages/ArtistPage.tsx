import type { FetchFilter } from '@nostr-post/signer';
import { fetchEvents } from '@nostr-post/signer';
import { useEffect, useState } from 'react';
import { ARTIST_MANIFEST, GIG_MANIFEST } from '../lib/manifests';
import { artistEditLink } from '../lib/routes';

const GIG_KINDS = [31922, 31923];

/**
 * The gigs that link a musician: by its page (`a` tag, any version's author) or by its profile
 * links (`i` tags), so gigs added before the page existed show too
 */
async function artistGigFilters(dTag: string): Promise<FetchFilter[]> {
  const versions = await fetchEvents({ kinds: [30818], '#d': [dTag] }).catch(() => []);
  const addresses = [...new Set(versions.map((v) => `30818:${v.pubkey}:${dTag}`))];
  const ids = [
    ...new Set(versions.flatMap((v) => v.tags.filter((t) => t[0] === 'i').map((t) => t[1] ?? ''))),
  ];
  return [
    ...(addresses.length ? [{ kinds: GIG_KINDS, '#a': addresses }] : []),
    ...(ids.length ? [{ kinds: GIG_KINDS, '#i': ids }] : []),
  ];
}

/** A musician's wiki page: their links as players, and their gigs */
export function ArtistPage({ dTag }: { dTag: string }) {
  const [filters, setFilters] = useState<FetchFilter[]>();
  useEffect(() => {
    let current = true;
    void artistGigFilters(dTag).then((f) => current && setFilters(f));
    return () => {
      current = false;
    };
  }, [dTag]);
  return (
    <>
      <p>
        <a href="#/">← All gigs</a> · <a href={artistEditLink(dTag)}>Edit</a> ·{' '}
        <a href="#/artist-new">Add an artist</a>
      </p>
      <nostr-wiki-view manifest={ARTIST_MANIFEST} entityId={dTag} />
      <h3>Gigs</h3>
      {filters?.length === 0 && <p>No gigs yet.</p>}
      {filters?.length ? <nostr-post-feed manifest={GIG_MANIFEST} filters={filters} /> : null}
    </>
  );
}
