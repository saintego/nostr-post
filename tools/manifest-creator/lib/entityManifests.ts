import type { NostrPostManifest } from '@nostr-post/core/types';
import { EXAMPLE_MANIFESTS } from './examples';

/**
 * Register the example wiki manifests (and `current`, if it is one) so entity
 * pickers can open a composer for "+ Create" by their `entityManifest` id.
 */
export async function registerEntityManifests(current?: NostrPostManifest): Promise<void> {
  const { registerEntityManifest } = await import('@nostr-post/plugin-wiki-entity');
  for (const manifest of [...Object.values(EXAMPLE_MANIFESTS), current]) {
    if (manifest && 'wikiConfig' in manifest) registerEntityManifest(manifest);
  }
}
