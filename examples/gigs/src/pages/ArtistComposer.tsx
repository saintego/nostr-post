import { useMemo } from 'react';
import { ARTIST_MANIFEST } from '../lib/manifests';
import { artistLink } from '../lib/routes';

/**
 * A new musician's page (with the `name` filled in when given), or editing one (`dTag`), with
 * `additions` added to it, e.g. links from a gig that the page doesn't have
 */
export function ArtistComposer({
  name,
  dTag,
  additions,
}: {
  name?: string;
  dTag?: string;
  additions?: Record<string, unknown>;
}) {
  const prefill = useMemo(() => (name ? { title: name } : undefined), [name]);
  const onPublished = (e: CustomEvent) => {
    const published = dTag ?? (e.detail as { dTag?: string } | undefined)?.dTag;
    if (published) location.hash = artistLink(published);
  };
  return (
    <>
      <h2>{dTag ? 'Edit a musician' : 'Add an artist'}</h2>
      {additions && (
        <p className="hint">Links from the gig are added below: check them and publish.</p>
      )}
      <nostr-wiki-composer
        manifest={ARTIST_MANIFEST}
        entityId={dTag}
        prefill={prefill}
        additions={additions}
        autoPublish
        onnostr-wiki-published={onPublished}
      />
    </>
  );
}
