/**
 * @nostr-post/plugins - Publish hooks
 *
 * Runs plugins' `beforePublish` hooks and lists their publish summaries
 * (`publishSummaryTagName`), so every composer (posts, wiki pages) shares them.
 * Framework-free: each composer renders the summary elements itself.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from './registry';
import type { NostrUIPlugin, PostField } from './types';

type GetPlugin = (id: string) => NostrUIPlugin | undefined;

const defaultGetPlugin: GetPlugin = (id) => pluginRegistry.get(id);

const hasValue = (value: unknown): boolean => value !== undefined && value !== null && value !== '';

/**
 * Runs the `beforePublish` hooks of the fields that have a value (e.g. the
 * venue field creating the venue's wiki page) and returns the tags they add.
 * A hook that fails rejects, so nothing is published.
 */
export const runBeforePublish = async (
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  pubkey: string,
  getPlugin: GetPlugin = defaultGetPlugin
): Promise<[string, ...string[]][]> => {
  const tags: [string, ...string[]][] = [];
  for (const field of manifest.fields) {
    const value = formData[field.id];
    const plugin = field.uiPlugin ? getPlugin(field.uiPlugin) : undefined;
    if (!hasValue(value) || !plugin?.beforePublish) continue;
    tags.push(...(await plugin.beforePublish(value, field as PostField, { pubkey })));
  }
  return tags;
};

/** A field whose plugin shows a summary next to the publish button */
export interface PublishSummary {
  field: PostField;
  value: unknown;
  /** The summary's custom element, e.g. `np-venue-wiki-publish` */
  tagName: string;
}

/** The publish summaries to show for the current form data */
export const publishSummaries = (
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  getPlugin: GetPlugin = defaultGetPlugin
): PublishSummary[] =>
  manifest.fields.flatMap((field) => {
    const value = formData[field.id];
    const tagName = field.uiPlugin ? getPlugin(field.uiPlugin)?.publishSummaryTagName : undefined;
    return tagName && hasValue(value) ? [{ field: field as PostField, value, tagName }] : [];
  });
