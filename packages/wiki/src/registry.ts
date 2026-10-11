import { resolveManifest } from '@nostr-post/core/manifest';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchManifestByATag } from '@nostr-post/signer';

/** Entity manifests by id, and by the `30078:` address they were fetched from */
const entityManifests = new Map<string, NostrPostManifest>();

/** Parents fetched from relays for `extends`, by reference (address or bare id) */
const fetchedParents = new Map<string, NostrPostManifest | null>();

const MAX_DEPTH = 10;

/** Merged results, valid while the registry doesn't change (same object for re-renders) */
let registryVersion = 0;
const merged = new WeakMap<NostrPostManifest, { version: number; result?: NostrPostManifest }>();

const parentRefs = (manifest: NostrPostManifest): string[] =>
  manifest.extends === undefined ? [] : [manifest.extends].flat();

/** A parent reference as known so far: registered, fetched, or not found (`null`) */
const knownParent = (ref: string): NostrPostManifest | null | undefined =>
  entityManifests.get(ref) ?? fetchedParents.get(ref);

/**
 * The manifest with its `extends` parents merged in (left to right, the child
 * last), or undefined while a parent hasn't been looked up yet. Parents that
 * weren't found are skipped.
 */
function withParents(manifest: NostrPostManifest): NostrPostManifest | undefined {
  const cached = merged.get(manifest);
  if (cached?.version === registryVersion) return cached.result;
  const result = mergeParents(manifest, 0);
  merged.set(manifest, { version: registryVersion, result });
  return result;
}

function mergeParents(manifest: NostrPostManifest, depth: number): NostrPostManifest | undefined {
  if (!manifest.extends) return manifest;
  const refs = parentRefs(manifest);
  if (depth >= MAX_DEPTH) return { ...manifest, extends: undefined };
  const parents: NostrPostManifest[] = [];
  for (const ref of refs) {
    const parent = knownParent(ref);
    if (parent === undefined) return undefined;
    const resolved = parent && mergeParents(parent, depth + 1);
    if (resolved === undefined) return undefined;
    if (resolved) parents.push(resolved);
  }
  const [first, ...rest] = parents;
  if (!first) return { ...manifest, extends: undefined };
  const base = rest.reduce((acc, cur) => resolveManifest(cur, acc), first);
  return resolveManifest(manifest, base);
}

/** Looks up the parents `withParents` is missing: registered ids first, then relays */
async function fetchMissingParents(manifest: NostrPostManifest, depth = 0): Promise<void> {
  if (depth >= MAX_DEPTH) return;
  for (const ref of parentRefs(manifest)) {
    if (knownParent(ref) === undefined) {
      // fetchManifestByATag resolves the fetched parent's own `extends`
      const stored = await fetchManifestByATag(ref).catch(() => undefined);
      fetchedParents.set(ref, stored?.manifest ?? null);
      registryVersion++;
    }
    const parent = knownParent(ref);
    if (parent) await fetchMissingParents(parent, depth + 1);
  }
}

/** A reference to an entity manifest: its id, a published manifest's address, or the manifest */
export type EntityManifestRef = string | NostrPostManifest;

/**
 * Make an entity manifest available by its id, e.g. to entity pickers
 * (`metadata.entityManifest`) and venue fields (`metadata.wikiEntity`), and as
 * a parent other entity manifests can `extends` by that id.
 */
export function registerEntityManifest(manifest: NostrPostManifest): void {
  entityManifests.set(manifest.id, manifest);
  registryVersion++;
}

/**
 * Resolve an entity manifest reference, if already known: an inline manifest,
 * a registered id, or an address resolved before (see resolveEntityManifest).
 * `extends` parents are merged in; while one hasn't been looked up yet, the
 * result is undefined and resolveEntityManifest looks it up.
 */
export function getEntityManifest(
  ref: EntityManifestRef | undefined
): NostrPostManifest | undefined {
  if (!ref) return undefined;
  const manifest = typeof ref === 'string' ? entityManifests.get(ref) : ref;
  return manifest && withParents(manifest);
}

const pending = new Map<string, Promise<NostrPostManifest | undefined>>();

/**
 * Like getEntityManifest, but also fetches a published manifest from relays
 * when the reference is its address (`30078:<pubkey>:nostr-post:<id>`), so any
 * app can use custom entity manifests without registering them in code, and
 * looks up `extends` parents that aren't registered (by address or bare id).
 * Fetched manifests are remembered, so getEntityManifest finds them afterwards.
 */
export async function resolveEntityManifest(
  ref: EntityManifestRef | undefined,
  relays?: string[]
): Promise<NostrPostManifest | undefined> {
  const known = getEntityManifest(ref);
  if (known || !ref) return known;
  const local = typeof ref === 'string' ? entityManifests.get(ref) : ref;
  if (local) {
    await fetchMissingParents(local);
    return withParents(local);
  }
  if (typeof ref !== 'string' || !ref.startsWith('30078:')) return undefined;
  let request = pending.get(ref);
  if (!request) {
    request = fetchManifestByATag(ref, relays)
      .then((stored) => {
        if (stored) {
          entityManifests.set(ref, stored.manifest);
          registryVersion++;
        }
        return stored?.manifest;
      })
      .catch(() => undefined)
      .finally(() => pending.delete(ref));
    pending.set(ref, request);
  }
  return request;
}
