import type { NostrPostManifest } from '@nostr-post/core/types';
import { EXAMPLE_MANIFESTS } from './examples';

let examplesRegistered = false;

/**
 * Register wiki manifests so entity pickers can scope searches and open a
 * composer for "+ Create" by their `entityManifest` id. Examples are
 * registered once; `current` (the manifest being edited) on every call, so
 * edits to a wiki manifest stay in effect after switching to another one.
 */
export async function registerEntityManifests(current?: NostrPostManifest): Promise<void> {
  const { registerEntityManifest } = await import('@nostr-post/plugin-wiki-entity');
  if (!examplesRegistered) {
    examplesRegistered = true;
    for (const manifest of Object.values(EXAMPLE_MANIFESTS)) {
      if ('wikiConfig' in manifest) registerEntityManifest(manifest);
    }
  }
  if (current && 'wikiConfig' in current) registerEntityManifest(current);
}
