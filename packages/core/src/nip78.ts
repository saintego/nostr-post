/**
 * @nostr-post/core - NIP-78 Manifest Storage
 *
 * Utilities for storing and retrieving NostrPostManifest definitions
 * as NIP-78 (kind 30078) parameterized replaceable events on Nostr relays.
 *
 * NIP-78 uses kind 30078 which is a "parameterized replaceable event":
 * - The `d` tag differentiates events of the same kind from the same author
 * - Publishing a new event with the same `d` tag replaces the old one
 * - Deleting is done by publishing an empty event with the same `d` tag
 *
 * Convention:
 * - d tag: `nostr-post:<manifest-id>` (e.g., "nostr-post:restaurant-review-v1")
 * - content: JSON-serialized NostrPostManifest
 * - Additional tags: `t` tags for discoverability, `name` for display
 */

import { getFieldTargets, getManifestAvailableKinds } from './manifestMappings';
import type { NostrPostManifest, UnsignedNostrEvent } from './types';

/** Kind number for NIP-78 application-specific data */
export const NIP78_KIND = 30078;

/** Prefix for the `d` tag to namespace our manifests */
export const MANIFEST_D_TAG_PREFIX = 'nostr-post:';

/**
 * A manifest stored on a Nostr relay as a NIP-78 event.
 */
export interface StoredManifest {
  /** The deserialized manifest */
  manifest: NostrPostManifest;
  /** Author's public key */
  pubkey: string;
  /** When the manifest was published/updated */
  createdAt: number;
  /** The full `d` tag value (e.g., "nostr-post:restaurant-review-v1") */
  dTag: string;
  /** The event ID (if from a signed event) */
  eventId?: string;
}

/**
 * A reference to a manifest stored on Nostr, following NIP-01 `a` tag format
 * for parameterized replaceable events: `<kind>:<pubkey>:<d-tag>`
 */
export interface ManifestRef {
  /** The manifest author's pubkey */
  pubkey: string;
  /** The `d` tag value */
  dTag: string;
}

/**
 * Build the `d` tag value for a manifest.
 *
 * @example
 * buildManifestDTag('restaurant-review-v1')
 * // => 'nostr-post:restaurant-review-v1'
 */
export function buildManifestDTag(manifestId: string): string {
  return `${MANIFEST_D_TAG_PREFIX}${manifestId}`;
}

/**
 * Parse a manifest ID from a `d` tag value.
 * Returns undefined if the tag doesn't match our prefix.
 *
 * @example
 * parseManifestDTag('nostr-post:restaurant-review-v1')
 * // => 'restaurant-review-v1'
 */
export function parseManifestDTag(dTag: string): string | undefined {
  if (!dTag.startsWith(MANIFEST_D_TAG_PREFIX)) return undefined;
  return dTag.slice(MANIFEST_D_TAG_PREFIX.length);
}

/**
 * Build an `a` tag value referencing a manifest (NIP-01 parameterized replaceable event ref).
 * Format: `30078:<pubkey>:<d-tag>`
 *
 * @example
 * buildManifestATag('abc123...', 'restaurant-review-v1')
 * // => '30078:abc123...:nostr-post:restaurant-review-v1'
 */
export function buildManifestATag(pubkey: string, manifestId: string): string {
  return `${NIP78_KIND}:${pubkey}:${buildManifestDTag(manifestId)}`;
}

/**
 * Parse a manifest reference from an `a` tag value.
 * Returns undefined if the tag doesn't match our format.
 */
export function parseManifestATag(aTagValue: string): ManifestRef | undefined {
  const parts = aTagValue.split(':');
  if (parts.length < 3) return undefined;

  const kind = Number.parseInt(parts[0], 10);
  if (kind !== NIP78_KIND) return undefined;

  const pubkey = parts[1];
  // Rejoin remaining parts since d-tag contains ':'
  const dTag = parts.slice(2).join(':');

  if (!dTag.startsWith(MANIFEST_D_TAG_PREFIX)) return undefined;

  return { pubkey, dTag };
}

/**
 * Serialize a NostrPostManifest into an unsigned kind 30078 event.
 * The event can then be signed and published to relays.
 */
export function manifestToEvent(manifest: NostrPostManifest, pubkey = ''): UnsignedNostrEvent {
  const dTag = buildManifestDTag(manifest.id);
  const aTag = buildManifestATag(pubkey, manifest.id);

  const tags: [string, ...string[]][] = [
    ['d', dTag],
    ['a', aTag],
  ];

  // Add name tag for discoverability
  if (manifest.metadata?.name) {
    tags.push(['name', manifest.metadata.name]);
  }

  // Add topic tags for search/filtering
  if (manifest.metadata?.tags) {
    for (const t of manifest.metadata.tags) {
      tags.push(['t', t]);
    }
  }

  // Always add a nostr-post topic tag
  tags.push(['t', 'nostr-post']);

  return {
    kind: NIP78_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: JSON.stringify(manifest),
    pubkey,
  };
}

/**
 * Deserialize a kind 30078 event back into a StoredManifest.
 * Returns undefined if the event is not a valid nostr-post manifest.
 */
export function eventToManifest(event: {
  kind: number;
  content: string;
  tags: string[][];
  pubkey: string;
  created_at: number;
  id?: string;
}): StoredManifest | undefined {
  if (event.kind !== NIP78_KIND) return undefined;

  // Find the d tag
  const dTagEntry = event.tags.find((t) => t[0] === 'd');
  if (!dTagEntry?.[1]) return undefined;

  const dTag = dTagEntry[1];
  if (!dTag.startsWith(MANIFEST_D_TAG_PREFIX)) return undefined;

  try {
    const manifest = JSON.parse(event.content) as NostrPostManifest;

    // Basic sanity check
    if (!manifest.id || !manifest.fields || !Array.isArray(manifest.fields)) {
      return undefined;
    }

    return {
      manifest,
      pubkey: event.pubkey,
      createdAt: event.created_at,
      dTag,
      eventId: event.id,
    };
  } catch {
    return undefined;
  }
}

/**
 * Create a deletion event for a manifest (publish empty content with same d-tag).
 * Per NIP-78, a replaceable event can be "deleted" by publishing with empty content.
 */
export function manifestDeleteEvent(manifestId: string, pubkey = ''): UnsignedNostrEvent {
  return {
    kind: NIP78_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['d', buildManifestDTag(manifestId)]],
    content: '',
    pubkey,
  };
}

// ── Manifest label (NIP-32) ──────────────────────────────────────────

/** NIP-32 namespace of the label naming the manifest an event was made with */
export const MANIFEST_LABEL_NAMESPACE = 'nostr-post';

/**
 * The tags saying which manifest an event was made with, by id: `["L", "nostr-post"]`,
 * `["l", "<id>", "nostr-post"]`. Unlike the `a` tag they don't need a published manifest,
 * and relays can combine them with `#a` (e.g. a venue's reviews of one manifest).
 */
export const manifestLabelTags = (manifestId: string): [string, ...string[]][] => [
  ['L', MANIFEST_LABEL_NAMESPACE],
  ['l', manifestId, MANIFEST_LABEL_NAMESPACE],
];

/** The id of the manifest an event is labelled with, if any */
export const manifestLabelOf = (tags: readonly string[][]): string | undefined =>
  tags.find((t) => t[0] === 'l' && t[2] === MANIFEST_LABEL_NAMESPACE)?.[1];

/** The address of the published manifest an event links (`a` tag `30078:…:nostr-post:<id>`) */
export const manifestATagOf = (tags: readonly string[][]): string | undefined =>
  tags.find((t) => t[0] === 'a' && !!t[1] && !!parseManifestATag(t[1]))?.[1];

/** Whether an event names this manifest id, by label or by its `a` tag */
export const eventUsesManifest = (tags: readonly string[][], manifestId: string): boolean => {
  if (manifestLabelOf(tags) === manifestId) return true;
  const address = manifestATagOf(tags);
  return !!address && parseManifestATag(address)?.dTag === buildManifestDTag(manifestId);
};

/** Tags that say nothing about a manifest's fields */
const GENERIC_TAGS = new Set(['L', 'l', 'a', 'e', 'p', 'd', 'client', 'alt']);

/**
 * Whether a manifest found by an event's label (not its exact `a` address) fits the event:
 * it has the event's kind, and when the event has field tags, at least one of them is a
 * tag the manifest maps. Another author's manifest with the same id may be a different one.
 */
export const manifestFitsEvent = (
  manifest: NostrPostManifest,
  event: { kind: number; tags: readonly string[][] }
): boolean => {
  if (!getManifestAvailableKinds(manifest).includes(event.kind)) return false;
  const eventTagNames = new Set(event.tags.map((t) => t[0]).filter((n) => !GENERIC_TAGS.has(n)));
  if (eventTagNames.size === 0) return true;
  const mapped = manifest.fields.flatMap((f) =>
    getFieldTargets(f).flatMap((t) => (t.kind === event.kind && t.tagName ? [t.tagName] : []))
  );
  return mapped.some((name) => eventTagNames.has(name));
};
