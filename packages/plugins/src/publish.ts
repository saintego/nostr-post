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

type Tag = [string, ...string[]];

/** The wiki page (`30818:<pubkey>:<d-tag>`) a hook linked, from its `a` tag */
const linkedPage = (tags: Tag[]): { pubkey: string; dTag: string } | undefined => {
  const match = tags.find((t) => t[0] === 'a')?.[1]?.match(/^30818:([^:]+):(.+)$/);
  return match ? { pubkey: match[1] as string, dTag: match[2] as string } : undefined;
};

/**
 * Runs the `beforePublish` hooks of the fields that have a value (e.g. the
 * venue field creating the venue's wiki page) and returns the tags they add,
 * plus the form data with each linked page set on its field (`wikiEntity`), so
 * the post can be built again with the link in its role (e.g. a mention line).
 * A hook that fails rejects, so nothing is published.
 */
export const runPublishHooks = async (
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  pubkey: string,
  getPlugin: GetPlugin = defaultGetPlugin
): Promise<{ tags: Tag[]; formData: Record<string, unknown> }> => {
  const tags: Tag[] = [];
  const linked: Record<string, unknown> = { ...formData };
  // The same value in two fields (e.g. one venue as "tasted at" and "purchased at") runs the
  // hook once: a second run could try to create the page the first one just published
  const done = new Map<string, Tag[]>();
  for (const field of manifest.fields) {
    const value = formData[field.id];
    const plugin = field.uiPlugin ? getPlugin(field.uiPlugin) : undefined;
    if (!hasValue(value) || !plugin?.beforePublish) continue;
    const key = `${field.uiPlugin}\u0000${JSON.stringify(value)}`;
    const added =
      done.get(key) ?? (await plugin.beforePublish(value, field as PostField, { pubkey }));
    done.set(key, added);
    tags.push(...added);
    const page = linkedPage(added);
    if (page && typeof value === 'object' && !Array.isArray(value)) {
      linked[field.id] = { ...value, wikiEntity: page };
    }
  }
  return { tags, formData: linked };
};

/** Like runPublishHooks, only the tags the hooks add */
export const runBeforePublish = async (
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  pubkey: string,
  getPlugin: GetPlugin = defaultGetPlugin
): Promise<Tag[]> => (await runPublishHooks(manifest, formData, pubkey, getPlugin)).tags;

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
