import type { NostrPostManifest } from '@nostr-post/core/types';
import type { ExternalIdLink } from './externalIds';
import { templateText } from './identity';
import type { WikiLinkTemplate, WikiManifest } from './types';

const encode = (value: string): string => encodeURIComponent(value).replace(/%3A/gi, ':');

/** A placeholder's value: `i:<namespace>` from the `i` tags, otherwise a field of `formData` */
function placeholderValue(
  name: string,
  tags: string[][],
  formData: Record<string, unknown>
): string | undefined {
  if (name.startsWith('i:')) {
    const prefix = `${name.slice(2)}:`;
    return tags.find((t) => t[0] === 'i' && t[1]?.startsWith(prefix))?.[1]?.slice(prefix.length);
  }
  return templateText(formData[name]) || undefined;
}

/** The link a template gives for an entity, if its condition holds and every placeholder has a value */
export function linkFromTemplate(
  template: WikiLinkTemplate,
  tags: string[][],
  formData: Record<string, unknown>
): ExternalIdLink | undefined {
  const { when } = template;
  if (when && templateText(formData[when.field]).toLowerCase() !== when.equals.toLowerCase()) {
    return undefined;
  }
  let missing = false;
  const url = template.url.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = placeholderValue(name.trim(), tags, formData);
    if (value === undefined) missing = true;
    return encode(value ?? '');
  });
  return missing ? undefined : { url, provider: template.label };
}

/** Links the manifest's `wikiConfig.links` derive for an entity (its tags and parsed form data) */
export function manifestLinks(
  manifest: NostrPostManifest,
  tags: string[][],
  formData: Record<string, unknown>
): ExternalIdLink[] {
  const templates = (manifest as WikiManifest).wikiConfig?.links ?? [];
  return templates
    .map((template) => linkFromTemplate(template, tags, formData))
    .filter((link): link is ExternalIdLink => !!link);
}
