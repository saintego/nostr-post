/** A link for a NIP-73 external ID, e.g. on an entity's `i` tag */
export interface ExternalIdLink {
  url: string;
  /** Who the link points to, e.g. "OpenStreetMap" */
  provider: string;
}

/** Link for an external ID of a known kind (`osm:node:123`, `gplace:…`, URLs); undefined otherwise */
export function externalIdLink(id: string): ExternalIdLink | undefined {
  const osm = id.match(/^osm:(node|way|relation):(\d+)$/);
  if (osm)
    return { url: `https://www.openstreetmap.org/${osm[1]}/${osm[2]}`, provider: 'OpenStreetMap' };
  if (id.startsWith('gplace:')) {
    const placeId = encodeURIComponent(id.slice('gplace:'.length));
    return {
      url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      provider: 'Google Maps',
    };
  }
  const host = id.match(/^https?:\/\/([^/?#\s]+)/)?.[1];
  return host ? { url: id, provider: host } : undefined;
}

/**
 * An entity's links to external pages: its `i` tags of known kinds and its
 * `r` (URL reference) tags. Duplicates removed.
 */
export function entityLinks(tags: string[][]): ExternalIdLink[] {
  const links = tags
    .filter((t) => (t[0] === 'i' || t[0] === 'r') && t[1])
    .map((t) => externalIdLink(t[1] as string))
    .filter((link): link is ExternalIdLink => !!link);
  return links.filter((link, i) => links.findIndex((l) => l.url === link.url) === i);
}
