import { ARTIST_PAGE_MANIFEST } from '../lib/manifests';
import { artistEditLink } from '../lib/routes';
import { ActionLink, PageActions } from './PageActions';

/**
 * A musician's wiki page: their links as players, and their upcoming gigs (the manifest's
 * "Gigs" section: gigs linking the page or its profile links, with "Add")
 */
export function ArtistPage({ dTag }: { dTag: string }) {
  return (
    <>
      <PageActions>
        <ActionLink href={artistEditLink(dTag)}>Edit</ActionLink>
        <ActionLink href="#/artist-new">Add an artist</ActionLink>
      </PageActions>
      <nostr-wiki-view manifest={ARTIST_PAGE_MANIFEST} entityId={dTag} />
    </>
  );
}
