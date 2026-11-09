/**
 * @nostr-post/posts - The publish format chosen by the files picked (`select` of a format):
 * photos make a photo post, a video a video post, a portrait video a short video.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';

/**
 * The format whose `select` fits every file of its field (as the field's plugin describes them,
 * `describeMedia`): one for portrait files first (a short video fits a video format too), else
 * the first; undefined when none does, or the field has no files
 */
export function selectedFormatFor(
  manifest: NostrPostManifest,
  formData: Record<string, unknown>
): string | undefined {
  const fitting = (manifest.publishFormats ?? []).filter(({ select }) => {
    if (!select) return false;
    const field = manifest.fields.find((f) => f.id === select.field);
    const describe = field && pluginRegistry.get(field.uiPlugin)?.describeMedia;
    const files = field && describe ? describe(formData[field.id], field) : [];
    return (
      files.length > 0 &&
      files.every(
        (file) => file.media === select.media && (!select.portrait || file.portrait === true)
      )
    );
  });
  return (fitting.find((f) => f.select?.portrait) ?? fitting[0])?.id;
}
