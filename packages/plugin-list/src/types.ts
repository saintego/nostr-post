/** The user's one standard bookmarks list (NIP-51), shown by most clients as "Bookmarks" */
export const BOOKMARKS_KIND = 10003;
/** Named bookmark sets (NIP-51), many per user: "Want to go", "Favourite pubs" */
export const BOOKMARK_SET_KIND = 30003;
/** Deletion requests (NIP-09) */
export const DELETION_KIND = 5;
/** Wiki pages (NIP-54): many authors publish versions of one entity under the same d-tag */
export const WIKI_KIND = 30818;

/** A Nostr event as lists read and write it */
export interface ListEvent {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  content: string;
  tags: string[][];
}

/**
 * Something saved in a list: an `a` tag (an addressable event, e.g. a wiki entity
 * `30818:<pubkey>:<d-tag>`) or an `e` tag (an event id).
 * Private (encrypted) items aren't read yet; see ROADMAP.md.
 */
export interface ListItem {
  tag: 'a' | 'e';
  value: string;
  /** Relay hint */
  relay?: string;
}

/** A bookmarks list or bookmark set */
export interface BookmarkList {
  /** `10003:<pubkey>:` or `30003:<pubkey>:<d-tag>` */
  address: string;
  kind: number;
  pubkey: string;
  /** Empty for the bookmarks list (kind 10003) */
  dTag: string;
  title?: string;
  description?: string;
  /** Public items, in the list's order */
  items: ListItem[];
  createdAt: number;
  /** The event it was read from: edits start from it, so tags other clients wrote are kept */
  event: ListEvent;
}

/** Where lists are read from and published to */
export interface ListRelayOptions {
  /** Relays besides the user's own (NIP-65 / signer); default DEFAULT_RELAYS */
  relays?: string[];
}
