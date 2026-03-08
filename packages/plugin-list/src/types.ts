/**
 * NIP-51 user list (p-list) data structure.
 * Represents a curated list of user pubkeys.
 */
export interface UserList {
  /** List name (e.g., "Trusted Reviewers", "Moderators") */
  name: string;
  /** List description */
  description?: string;
  /** List of pubkeys included in this list */
  pubkeys: string[];
  /** When this list was created (unix timestamp) */
  createdAt?: number;
  /** List ID for internal reference */
  id?: string;
}

/**
 * Form data for list operations.
 * Used by the composer when creating/editing list assignments.
 */
export interface ListSelectionData {
  /** Selected list names/IDs */
  listIds: string[];
  /** Backward-compatible single selected list ID */
  listId?: string;
  /** Explicitly selected pubkeys to add to list */
  pubkeys?: string[];
}

/**
 * Plugin configuration.
 */
export interface ListPluginConfig {
  /** Relay URLs to use for list fetching. Defaults to user's relays. */
  relays?: string[];
  /** Allow creating new lists inline */
  allowCreate?: boolean;
  /** Allow deleting lists */
  allowDelete?: boolean;
  /** Default list preset (e.g., "community-moderation") */
  defaultList?: string;
  /** Allow selecting multiple lists in one field (default: true) */
  multiple?: boolean;
}

/**
 * NIP-51 list event (kind 30000-30099).
 * Represents a tagged list on Nostr.
 *
 * Kind 30000: Mute list (p: Pubkey, t: Hashtag, e: Event ID)
 * Kind 30001: Pinned notes
 * Kind 30002: Relay list (relay URLs)
 * Kind 30003: Bookmark list
 * Kind 30004: Communities list (a: Community addresses)
 * Kind 30005: Public chats list
 * Kind 30006: Blocked relays
 * Kind 30007: Search relays
 * Kind 30008: Relay sets (with name d-tag)
 * Kind 30009: User groups
 * ...
 * Kind 30050: Deprecated user list
 */
export interface Nip51ListEvent {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number; // 30000-30099
  content: string; // List description
  tags: Array<[string, ...string[]]>;
}

/**
 * Parsed NIP-51 list structure from JSON content.
 */
export interface Nip51ParsedList {
  name: string;
  about?: string;
  picture?: string;
  pubkeys?: [string, string][]; // [pubkey, relay_hint]
  emails?: [string, string][]; // [email, relay_hint]
  hashtags?: [string, string][]; // [hashtag, relay_hint]
  relay_hints?: string[];
}
