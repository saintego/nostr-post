/**
 * A page's lead: readable lines before the infobox, e.g. "Genres: #punk #hardcore" and
 * "Listen: https://…", so the page reads well where only its text shows (Nostr clients that
 * show wiki pages in feeds, wikis that don't know the manifest). Opt-in with `wikiConfig.lead`:
 * the ids of fields kept in tags only (the infobox has the others). The lead is derived from
 * those fields' values each time the page is written; reading builds it again from the tags and
 * strips it, so it never ends up in a field's text.
 */

import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { serializeForTable } from './infoboxTable';
import { isRoleField } from './roleRefs';
import type { WikiManifest } from './types';

const WIKI_KIND = 30818;

/** A field the lead can show: mapped to wiki tags only (other than title and d), not a reference */
const isTagOnly = (field: PostField): boolean => {
  const targets = [field.mapTo].flat().filter((t) => t.kind === WIKI_KIND);
  return (
    targets.length > 0 &&
    targets.every((t) => t.target === 'tag' && t.tagName !== 'title' && t.tagName !== 'd') &&
    field.type !== 'ref' &&
    !isRoleField(field)
  );
};

/** The fields `wikiConfig.lead` names, in its order, that the lead can show */
export const leadFields = (manifest: NostrPostManifest | WikiManifest): PostField[] => {
  const ids = (manifest as WikiManifest).wikiConfig?.lead ?? [];
  return ids.flatMap((id) => manifest.fields.find((f) => f.id === id && isTagOnly(f)) ?? []);
};

/** A value as the lead shows it: the plugin's text for the values (as a list), else plain text */
const leadText = (field: PostField, value: unknown): string => {
  const items = (Array.isArray(value) ? value : [value]).filter(
    (v) => v !== undefined && v !== null && v !== ''
  );
  if (!items.length) return '';
  const formatted = pluginRegistry.get(field.uiPlugin)?.formatValue?.(items)?.trim();
  return formatted || items.map(serializeForTable).join(', ');
};

/** The lead for form data (or data read from tags): a "Label: value" paragraph per field */
export const wikiLead = (
  manifest: NostrPostManifest | WikiManifest,
  data: Record<string, unknown>
): string =>
  leadFields(manifest)
    .flatMap((field) => {
      const text = leadText(field, data[field.id]);
      const label = (field.metadata?.label as string | undefined) ?? field.id;
      return text ? [`${label}: ${text}`] : [];
    })
    .join('\n\n');

/** The lead fields' labels, as their lead paragraphs start ("Listen", "Genres") */
export const leadLabels = (manifest: NostrPostManifest | WikiManifest): string[] =>
  leadFields(manifest).map((field) => (field.metadata?.label as string | undefined) ?? field.id);

/**
 * The content without its lead: this lead where it starts with exactly it, and the leading
 * paragraphs that start with a lead field's label ("Listen: …"), e.g. a lead written with
 * another formatting of the values (a plugin not loaded, another client) or before the tags changed
 */
export const withoutLead = (content: string, lead: string, labels: string[] = []): string => {
  const rest = lead && content.startsWith(lead) ? content.slice(lead.length).trimStart() : content;
  const paragraphs = rest.split(/\n\s*\n/);
  const isLead = (p: string) => labels.some((label) => p.trimStart().startsWith(`${label}: `));
  const kept = paragraphs.findIndex((p) => !isLead(p));
  if (kept === -1) return '';
  return kept === 0 ? rest : paragraphs.slice(kept).join('\n\n').trimStart();
};
