/**
 * @nostr-post/plugin-list - Core
 *
 * NIP-51 user lists plugin for managing curated lists of users
 * on Nostr. Supports fetching, creating, and deleting lists.
 *
 * Lists can be used for:
 * - Audience control (who can see/respond to events)
 * - Trust networks (verified reviewers, moderators)
 * - Content curation (favorite authors, trusted sources)
 * - Access control (invite-only groups)
 *
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import type { ListSelectionData, Nip51ListEvent, UserList } from './types';

const getSelectedListIds = (value: unknown): string[] => {
  if (!value || typeof value !== 'object') return [];
  const listData = value as ListSelectionData;

  if (Array.isArray(listData.listIds)) {
    return listData.listIds.filter((id) => typeof id === 'string' && id.length > 0);
  }

  if (typeof listData.listId === 'string' && listData.listId.length > 0) {
    return [listData.listId];
  }

  return [];
};

/**
 * Fetch all NIP-51 lists (kind 30000-30099) for a user.
 * Returns parsed list data with pubkey/tag entries.
 */
export const fetchUserLists = async (userPubkey: string, relays: string[]): Promise<UserList[]> => {
  if (!userPubkey || relays.length === 0) {
    return [];
  }

  const lists: UserList[] = [];

  try {
    // Fetch all kinds 30000-30099 owned by this user
    for (const relay of relays) {
      try {
        const url = new URL(relay);
        const wsUrl =
          url.protocol === 'https:'
            ? url.href.replace('https:', 'wss:')
            : url.href.replace('http:', 'ws:');

        // Use NIP-45 COUNT or just fetch events
        const events = await fetchFromRelay(wsUrl, {
          kinds: Array.from({ length: 100 }, (_, i) => 30000 + i),
          authors: [userPubkey],
        });

        for (const event of events) {
          const list = parseListEvent(event);
          if (list) {
            lists.push(list);
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch lists from relay ${relay}:`, err);
        // Continue with other relays
      }
    }
  } catch (err) {
    console.error('Error fetching user lists:', err);
  }

  return lists;
};

/**
 * Parse a NIP-51 list event into UserList format.
 */
export const parseListEvent = (event: Nip51ListEvent): UserList | null => {
  try {
    const dTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1];
    const name = dTag || `List-${event.kind}`;

    // Extract pubkeys from 'p' tags
    const pubkeys = event.tags
      .filter((t: string[]) => t[0] === 'p')
      .map((t: string[]) => t[1])
      .filter(Boolean);

    return {
      id: `${event.kind}:${event.pubkey}:${dTag}`,
      name,
      description: event.content,
      pubkeys,
      createdAt: event.created_at,
    };
  } catch (err) {
    console.error('Failed to parse list event:', err);
    return null;
  }
};

/**
 * Create a new NIP-51 list event.
 * Returns unsigned event; caller must sign and publish.
 */
export const createListEvent = (
  userPubkey: string,
  listName: string,
  pubkeys: string[],
  listKind = 30000,
  description = ''
): Nip51ListEvent => {
  return {
    kind: listKind,
    pubkey: userPubkey,
    created_at: Math.floor(Date.now() / 1000),
    content: description,
    tags: [['d', listName], ...pubkeys.map((pk) => ['p', pk])],
  };
};

/**
 * Fetch events from a relay using a simple HTTP subscription.
 * This is a basic implementation; production code should use proper NIP-01.
 */
async function fetchFromRelay(
  _wsUrl: string,
  _filters: { kinds: number[]; authors: string[] }
): Promise<Nip51ListEvent[]> {
  // This is a placeholder - actual implementation would use WebSocket or REST
  // For now, return empty array to indicate not implemented
  console.warn('Relay fetching not fully implemented. Use NIP-01 WebSocket or REST endpoints.');
  return [];
}

/**
 * Main plugin definition.
 */
export const listPlugin: NostrUIPlugin = {
  id: 'list',
  type: 'string', // Lists are stored as string IDs or JSON

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (!value) {
      // Lists are optional by default
      return { success: true };
    }

    const selectedListIds = getSelectedListIds(value);

    if (selectedListIds.length === 0) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'At least one valid list ID must be provided',
          code: 'INVALID_LIST_ID',
        },
      };
    }

    return { success: true };
  },

  formatValue: (value: unknown, _field: PostField) => {
    if (!value) return '';
    const selectedListIds = getSelectedListIds(value);
    return selectedListIds.join(',');
  },

  serializeValue: (value: unknown, _field: PostField) => {
    if (!value) return '';
    const selectedListIds = getSelectedListIds(value);
    // Store as comma-separated IDs for tag/content mapping targets
    return selectedListIds.join(',');
  },

  deserializeValue: (value: unknown, _field: PostField) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const listIds = value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      return { listIds } as ListSelectionData;
    }

    if (Array.isArray(value)) {
      const listIds = value
        .filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      return { listIds } as ListSelectionData;
    }

    return {
      listIds: [String(value)],
    } as ListSelectionData;
  },

  // Extra tags hook for multi-event coordination
  extraTags: (value: unknown, _field: PostField) => {
    if (!value) return [];

    const listData = value as ListSelectionData;
    const selectedListIds = getSelectedListIds(value);
    const tags: Array<[string, ...string[]]> = [];

    // Add list references as NIP-73 tags
    for (const listId of selectedListIds) {
      tags.push(['i', `list:${listId}`]);
    }

    // Add explicit pubkey references if provided
    if (listData.pubkeys && listData.pubkeys.length > 0) {
      for (const pk of listData.pubkeys) {
        tags.push(['p', pk]);
      }
    }

    return tags;
  },
};
