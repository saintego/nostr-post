/** The user's one standard bookmarks list (NIP-51), shown by most clients as "Bookmarks" */
export const BOOKMARKS_KIND = 10003;
/** Named bookmark sets (NIP-51), many per user: "Want to go", "Favourite pubs" */
export const BOOKMARK_SET_KIND = 30003;
/** Calendars (NIP-52): named lists of calendar events, many per user */
export const CALENDAR_KIND = 31924;
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

/** A bookmarks list, bookmark set or calendar */
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

/**
 * A kind of list: its named sets (many per user, with a d-tag), and the one standard list
 * of the kind (no d-tag), if it has one
 */
export interface ListKind {
  set: number;
  standard?: number;
}

/** NIP-51 bookmarks: the bookmarks list (10003) and bookmark sets (30003); the default */
export const BOOKMARK_LISTS: ListKind = { set: BOOKMARK_SET_KIND, standard: BOOKMARKS_KIND };

/** NIP-52 calendars (31924): sets only */
export const CALENDAR_LISTS: ListKind = { set: CALENDAR_KIND };

/** Where lists are read from and published to, and which kind of list */
export interface ListRelayOptions {
  /** Relays besides the user's own (NIP-65 / signer); default DEFAULT_RELAYS */
  relays?: string[];
  /** Default BOOKMARK_LISTS */
  listKind?: ListKind;
}
