/**
 * A Google Maps link pasted by the author, read from its text alone: no
 * request to Google (its terms don't allow taking data from its pages, and
 * browsers block it anyway). The link gives the place's name (as the link
 * shows it), a point to search OpenStreetMap around, and its CID: a stable
 * Google identity, kept as `i gcid:<cid>`; the Google Maps link is worked out
 * from it when shown, not stored.
 */

export interface GoogleMapsLink {
  /** The name in the link's path, e.g. "U Fleků"; the query of a search link */
  name?: string;
  lat?: number;
  lon?: number;
  /** Google's customer id of the place (decimal) */
  cid?: string;
  /**
   * A short share link (maps.app.goo.gl): only Google can open it, so the place is searched by
   * the name and address of the share text (`googlePlaces.ts`)
   */
  short?: boolean;
  /** A share text's address line (the phone apps put name and address above the link) */
  address?: string;
  /** The Google place id, once a short link's place was found (kept as `i gplace:`) */
  placeId?: string;
}

const isGoogleMapsHost = (host: string, path: string): boolean =>
  /(^|\.)google\.[a-z.]+$/.test(host) && (host.startsWith('maps.') || path.startsWith('/maps'));

const decodePart = (part: string): string => {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' ')).trim();
  } catch {
    return part.trim();
  }
};

/** The CID in a feature id `0x<cell>:0x<cid>` (second half, hexadecimal) */
const cidFromFeature = (data: string): string | undefined => {
  const hex = data.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i)?.[1];
  return hex ? BigInt(`0x${hex}`).toString() : undefined;
};

/** The point: the place's own (`!3d<lat>!4d<lon>`), else the map's centre (`/@lat,lon,…`) */
const pointOf = (path: string): { lat?: number; lon?: number } => {
  const own = path.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const centre = path.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const found = own ?? centre;
  return found ? { lat: Number(found[1]), lon: Number(found[2]) } : {};
};

/** The lines of a share text around its link: the place's name, then its address */
const shareLines = (text: string, link: string): { name?: string; address?: string } => {
  const [name, address] = text
    .split(/\r?\n/)
    .map((line) => line.replace(link, '').trim())
    .filter((line) => line && !/^https?:\/\//i.test(line));
  return { ...(name ? { name } : {}), ...(address ? { address } : {}) };
};

/**
 * What a pasted Google Maps link says, also inside a share text ("Name\nAddress\nlink", as the
 * phone apps share a place); undefined if the text has no Google Maps link
 */
export function parseGoogleMapsUrl(text: string): GoogleMapsLink | undefined {
  const link = text.match(/https?:\/\/\S+/)?.[0] ?? text.trim();
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps'))) {
    return { short: true, ...shareLines(text, link) };
  }
  if (!isGoogleMapsHost(host, url.pathname)) return undefined;

  const path = decodePart(url.pathname);
  const named = url.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/)?.[1];
  const cid = url.searchParams.get('cid') ?? cidFromFeature(path);
  return {
    name: named ? decodePart(named) : (url.searchParams.get('q') ?? undefined),
    ...pointOf(path),
    cid: cid && /^\d+$/.test(cid) ? cid : undefined,
  };
}

/** The `i` tag value of a Google place */
export const googleCidIdentifier = (cid: string): string => `gcid:${cid}`;

/** The Google Maps link of a place, from its CID */
export const googleMapsCidUrl = (cid: string): string => `https://maps.google.com/?cid=${cid}`;
