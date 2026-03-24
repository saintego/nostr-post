import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';

const builtInPluginLoaders: Record<string, () => Promise<unknown>> = {
  stars: () => import('@nostr-post/plugin-stars/web'),
  geo: () => import('@nostr-post/plugin-geo/web'),
  venue: () => import('@nostr-post/plugin-venue/web'),
  media: () => import('@nostr-post/plugin-media/web'),
  reference: () => import('@nostr-post/plugin-reference/web'),
  markdown: () => import('@nostr-post/plugin-markdown/web'),
  hashtag: () => import('@nostr-post/plugin-hashtag/web'),
  list: () => import('@nostr-post/plugin-list/web'),
};

const pendingPluginLoads = new Map<string, Promise<unknown>>();

const ensurePluginLoaded = async (pluginId: string) => {
  if (pluginRegistry.has(pluginId)) return;

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

export const ensurePluginsForManifest = async (manifest?: NostrPostManifest) => {
  if (!manifest || typeof window === 'undefined') return;

  const pluginIds = Array.from(
    new Set(manifest.fields.map((field) => field.uiPlugin).filter(Boolean))
  );

  await Promise.all(pluginIds.map((pluginId) => ensurePluginLoaded(pluginId)));
};
