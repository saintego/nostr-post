import type { NostrPostManifest } from '@nostr-post/core/types';
import { EXAMPLE_MANIFESTS } from './examples';

let examplesRegistered = false;

/**
 * Register manifests so entity pickers can scope searches and open a composer
 * for "+ Create" by their `entityManifest` id, and so entity manifests can
 * `extends` another example by id (the beer entity extends the BJCP style
 * list). Examples are registered once; `current` (the manifest being edited,
 * if it's a wiki manifest) on every call, so edits stay in effect after
 * switching to another one.
 */
export async function registerEntityManifests(current?: NostrPostManifest): Promise<void> {
  const { registerEntityManifest } = await import('@nostr-post/plugin-wiki-entity');
  if (!examplesRegistered) {
    examplesRegistered = true;
    for (const manifest of Object.values(EXAMPLE_MANIFESTS)) registerEntityManifest(manifest);
  }
  if (current && 'wikiConfig' in current) registerEntityManifest(current);
}
