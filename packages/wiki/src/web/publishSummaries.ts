/**
 * Plugins' publish summaries next to the wiki composer's publish button, e.g.
 * the venue field's "Also create/update the venue's wiki page" panel. What they
 * show is published by the plugins' beforePublish hooks (runBeforePublish).
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { publishSummaries } from '@nostr-post/plugins/publish';
import type { TemplateResult } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

export const renderPublishSummaries = (
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  onFieldChange: (fieldId: string, value: unknown) => void
): TemplateResult[] =>
  publishSummaries(manifest, formData).map(({ field, value, tagName }) => {
    const tag = unsafeStatic(tagName);
    return staticHtml`<${tag}
      .value=${value}
      .field=${field}
      @np-value-changed=${(e: CustomEvent) => onFieldChange(field.id, e.detail.value)}
    ></${tag}>`;
  });

/** Tags added to an event, without duplicating any it has */
export const withHookTags = (
  tags: [string, ...string[]][],
  added: [string, ...string[]][]
): [string, ...string[]][] => {
  const key = (t: string[]) => t.join('\u0000');
  const existing = new Set(tags.map(key));
  return [...tags, ...added.filter((t) => !existing.has(key(t)))];
};
