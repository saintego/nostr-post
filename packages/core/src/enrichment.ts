/**
 * @nostr-post/core - Form data enrichment pipeline
 *
 * Cross-platform utility for running plugin-owned enrichments before event
 * coordination. Works in any environment (browser, Node, React Native)
 * without DOM dependencies.
 *
 * Usage:
 *   import { prepareFormData } from '@nostr-post/core/enrichment';
 *   import { pluginRegistry } from '@nostr-post/plugins/registry';
 *
 *   const enriched = prepareFormData(manifest, formData, (id) => pluginRegistry.get(id));
 *   const result  = coordinateEvents(manifest, enriched, {
 *     tagSerializer: (v, f) => pluginRegistry.get(f.uiPlugin)?.serializeValue?.(v, f),
 *     extraTagsFn:   (v, f) => pluginRegistry.get(f.uiPlugin)?.extraTags?.(v, f),
 *   });
 */

import type { FormData, NostrPostManifest, PostField } from './types';

/** Minimal plugin shape needed for the enrichment pipeline. */
export interface EnrichablePlugin {
  enrichFormData?: (formData: Record<string, unknown>, field: PostField) => Record<string, unknown>;
}

/**
 * Run manifest-driven enrichment over form data.
 *
 * Iterates manifest fields in order and calls each plugin's `enrichFormData`.
 * Results from each enrichment are merged before the next plugin runs,
 * so plugins can see earlier enrichments (e.g. reference plugin can see
 * hashtags already extracted).
 *
 * @param manifest  - The post manifest defining fields and their plugins
 * @param formData  - Raw form data (from the composer or an API caller)
 * @param getPlugin - Resolver to look up a plugin by ID (e.g. pluginRegistry.get)
 * @returns New form data object with all plugin enrichments applied
 */
export const prepareFormData = (
  manifest: NostrPostManifest,
  formData: FormData,
  getPlugin: (pluginId: string) => EnrichablePlugin | undefined
): FormData => {
  const enriched: Record<string, unknown> = { ...formData };

  for (const field of manifest.fields) {
    if (!field.uiPlugin) continue;
    const plugin = getPlugin(field.uiPlugin);
    if (!plugin?.enrichFormData) continue;
    const result = plugin.enrichFormData(enriched, field);
    if (Object.keys(result).length > 0) {
      Object.assign(enriched, result);
    }
  }

  return enriched as FormData;
};
