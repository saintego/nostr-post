import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchManifestByATag } from '@nostr-post/signer';

/** Entity manifests by id, and by the `30078:` address they were fetched from */
const entityManifests = new Map<string, NostrPostManifest>();

/** A reference to an entity manifest: its id, a published manifest's address, or the manifest */
export type EntityManifestRef = string | NostrPostManifest;

/**
 * Make an entity manifest available by its id, e.g. to entity pickers
 * (`metadata.entityManifest`) and venue fields (`metadata.wikiEntity`).
 */
export function registerEntityManifest(manifest: NostrPostManifest): void {
  entityManifests.set(manifest.id, manifest);
}

/**
 * Resolve an entity manifest reference, if already known: an inline manifest,
 * a registered id, or an address resolved before (see resolveEntityManifest).
 */
export function getEntityManifest(
  ref: EntityManifestRef | undefined
): NostrPostManifest | undefined {
  if (!ref) return undefined;
  return typeof ref === 'string' ? entityManifests.get(ref) : ref;
}

const pending = new Map<string, Promise<NostrPostManifest | undefined>>();

/**
 * Like getEntityManifest, but also fetches a published manifest from relays
 * when the reference is its address (`30078:<pubkey>:nostr-post:<id>`), so any
 * app can use custom entity manifests without registering them in code.
 * Fetched manifests are remembered, so getEntityManifest finds them afterwards.
 */
export async function resolveEntityManifest(
  ref: EntityManifestRef | undefined,
  relays?: string[]
): Promise<NostrPostManifest | undefined> {
  const known = getEntityManifest(ref);
  if (known || typeof ref !== 'string' || !ref.startsWith('30078:')) return known;
  let request = pending.get(ref);
  if (!request) {
    request = fetchManifestByATag(ref, relays)
      .then((stored) => {
        if (stored) entityManifests.set(ref, stored.manifest);
        return stored?.manifest;
      })
      .catch(() => undefined)
      .finally(() => pending.delete(ref));
    pending.set(ref, request);
  }
  return request;
}
