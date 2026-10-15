/**
 * OpenStreetMap element details from the OSM API (tags + version).
 * Nominatim is used for search; this returns what the element says now.
 */

export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  /** Incremented on every edit in OSM */
  version: number;
  tags: Record<string, string>;
}

/** Fetch an element's current tags and version (CORS-enabled, no key). */
export async function fetchOsmElement(
  type: OsmElement['type'],
  id: string | number
): Promise<OsmElement | null> {
  const resp = await fetch(`https://api.openstreetmap.org/api/0.6/${type}/${id}.json`);
  if (!resp.ok) return null;
  const data = (await resp.json()) as { elements?: OsmElement[] };
  const element = data.elements?.[0];
  return element ? { ...element, tags: element.tags ?? {} } : null;
}
