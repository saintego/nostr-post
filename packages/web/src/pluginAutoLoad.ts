import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';

const builtInPluginLoaders: Record<string, () => Promise<unknown>> = {
  identifier: () => import('@nostr-post/plugin-identifier/web'),
  stars: () => import('@nostr-post/plugin-stars/web'),
  geo: () => import('@nostr-post/plugin-geo/web'),
  date: () => import('@nostr-post/plugin-date/web'),
  profile: () => import('@nostr-post/plugin-profile/web'),
  embed: () => import('@nostr-post/plugin-embed/web'),
  venue: () => import('@nostr-post/plugin-venue/web'),
  media: () => import('@nostr-post/plugin-media/web'),
  reference: () => import('@nostr-post/plugin-reference/web'),
  markdown: () => import('@nostr-post/plugin-markdown/web'),
  hashtag: () => import('@nostr-post/plugin-hashtag/web'),
  list: () => import('@nostr-post/list/web'),
};

const pendingPluginLoads = new Map<string, Promise<unknown>>();

const ensurePluginLoaded = async (pluginId: string) => {
  // A plugin registered from its main entry only (e.g. an app imported a helper from it)
  // has no input yet: its web entry still has to load
  const registered = pluginRegistry.get(pluginId);
  if (registered && (registered.inputTagName || !builtInPluginLoaders[pluginId])) return;

  const existing = pendingPluginLoads.get(pluginId);
  if (existing) {
    await existing;
    return;
  }

  const loader = builtInPluginLoaders[pluginId];
  if (!loader || typeof window === 'undefined') return;

  const pending = loader().finally(() => {
    pendingPluginLoads.delete(pluginId);
  });

  pendingPluginLoads.set(pluginId, pending);
  await pending;
};

/**
 * Loads the field plugins a manifest uses (their web entries, which register them), e.g. before
 * reading form JSON or building its schema when no composer has loaded them yet
 */
export const ensurePluginsForManifest = async (manifest?: NostrPostManifest) => {
  if (!manifest || typeof window === 'undefined') return;

  const pluginIds = Array.from(
    new Set(manifest.fields.map((field) => field.uiPlugin).filter(Boolean))
  );

  await Promise.all(pluginIds.map((pluginId) => ensurePluginLoaded(pluginId)));
};
