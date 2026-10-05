import type { NostrPostManifest } from '@nostr-post/core/types';

const entityManifests = new Map<string, NostrPostManifest>();

/**
 * Make an entity manifest available by its id, e.g. to entity pickers
 * (`metadata.entityManifest`) and venue fields (`metadata.wikiEntity`).
 */
export function registerEntityManifest(manifest: NostrPostManifest): void {
  entityManifests.set(manifest.id, manifest);
}

/** Resolve an entity manifest reference (its id, or the manifest itself), if known. */
export function getEntityManifest(
  ref: string | NostrPostManifest | undefined
): NostrPostManifest | undefined {
  if (!ref) return undefined;
  return typeof ref === 'string' ? entityManifests.get(ref) : ref;
}
