/**
 * @nostr-post/core - Where an event comes from (NIP-48 proxy tags)
 *
 * `["proxy", <id>, <protocol>]` says an event originated elsewhere and names the source object:
 * an ActivityPub object's URL (e.g. a Gancio event), an AT URI, an RSS feed URL with the item's
 * guid as fragment, or a web page's URL (e.g. a Facebook event). Clients link to the source, and
 * importers find whether an event was already bridged (`#proxy` filters), so they don't publish
 * it twice. No dependencies.
 */

import type { NostrTag } from './types';

/** NIP-48's protocols */
export const PROXY_PROTOCOLS = ['activitypub', 'atproto', 'rss', 'web'] as const;
export type ProxyProtocol = (typeof PROXY_PROTOCOLS)[number];

/** An event's source, from its proxy tag */
export interface ProxySource {
  id: string;
  protocol: string;
}

/** The proxy tag of a source; `web` by default (a page's URL) */
export const proxyTag = (id: string, protocol: ProxyProtocol = 'web'): NostrTag => [
  'proxy',
  id,
  protocol,
];

/** The event's source, from its first proxy tag with an id */
export const proxyOf = (tags: readonly (readonly string[])[]): ProxySource | undefined => {
  const tag = tags.find((t) => t[0] === 'proxy' && t[1]);
  return tag?.[1] ? { id: tag[1], protocol: tag[2] ?? 'web' } : undefined;
};

const isWebUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** `at://did/app.bsky.feed.post/rkey` → the post on bsky.app */
const atprotoUrl = (uri: string): string | undefined => {
  const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)/.exec(uri);
  return match ? `https://bsky.app/profile/${match[1]}/post/${match[2]}` : undefined;
};

/** An RSS id (feed URL with the item's guid as fragment): the item's URL if the guid is one */
const rssUrl = (id: string): string | undefined => {
  const hash = id.indexOf('#');
  if (hash < 0) return isWebUrl(id) ? id : undefined;
  const guid = decodeURIComponent(id.slice(hash + 1));
  if (isWebUrl(guid)) return guid;
  const feed = id.slice(0, hash);
  return isWebUrl(feed) ? feed : undefined;
};

/** A link a browser can open to the source; undefined when its id isn't one */
export const sourceUrl = (source: ProxySource): string | undefined => {
  if (source.protocol === 'atproto') return atprotoUrl(source.id);
  if (source.protocol === 'rss') return rssUrl(source.id);
  return isWebUrl(source.id) ? source.id : undefined;
};

/** The site of a link, as people name it: `https://www.facebook.com/…` → `facebook.com` */
export const siteOf = (url: string): string =>
  /^[a-z][a-z0-9+.-]*:\/\/(?:[^/?#@]*@)?([^/?#:]+)/i.exec(url)?.[1]?.replace(/^www\./i, '') ?? url;
