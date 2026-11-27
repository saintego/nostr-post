/**
 * @nostr-post/plugin-links - Core
 *
 * The `links` field plugin (also under the id `embed`, from before it was merged with it): a
 * field's links, one or several (`metadata.multiple`), each shown by the rules (`rules.ts`): a
 * player, a site's button, a QR code or a link. A value is a link (`r` tags, for example) or an
 * entry with a label, icon and description (`LinkEntry`, in a NIP-78 post's content). Links to
 * profiles (`profileLinks.ts`) are also written as NIP-73 `i` tags in canonical form.
 * No DOM dependencies.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import { DEFAULT_LINK_RULES } from './defaultRules';
import { profileLink, profileUrls } from './profileLinks';
import { isShowableLink, normalizeLink, viewLink } from './rules';
import { linkRules } from './settings';

/** A provider of players, e.g. `youtube` (a rule's `provider`) */
export type EmbedProvider = string;

/** How to show a link as a player */
export interface Embed {
  provider: EmbedProvider;
  /** The iframe's URL */
  src: string;
  /** Fixed height in pixels (audio players), else a 16:9 video */
  height?: number;
}

/** A link with what shows with it */
export interface LinkEntry {
  url: string;
  /** Shown instead of the site's name */
  label?: string;
  /** An emoji before the label */
  icon?: string;
  /** A line under the label, e.g. "Quick and easy way to show support" */
  description?: string;
}

/** The player for a link under the built-in rules (or `rules`); undefined for links without one */
export const embedFor = (link: string, rules = DEFAULT_LINK_RULES): Embed | undefined => {
  const view = viewLink(link, rules);
  if (view.format !== 'embed' || !view.src) return undefined;
  return {
    provider: view.rule?.provider ?? view.rule?.id ?? '',
    src: view.src,
    ...(view.height ? { height: view.height } : {}),
  };
};

/** The provider of a link (also of a Bandcamp page, which gets no player), else undefined */
export const linkProvider = (link: string, rules = DEFAULT_LINK_RULES): EmbedProvider | undefined =>
  viewLink(link, rules).rule?.provider;

/**
 * The link in a site's embed code (`<iframe src="…">`), e.g. Bandcamp's "Share / Embed" code,
 * whose player link has the album number its page link lacks; other text as it is
 */
export const linkFromEmbedCode = (text: string): string => {
  const src = text.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  return src ? src.replace(/&amp;/g, '&') : text;
};

/** An entry from stored data (a link, an entry object or its JSON); undefined for anything else */
export const parseLinkEntry = (raw: unknown): LinkEntry | undefined => {
  let item = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text.startsWith('{')) return text ? { url: normalizeLink(text) } : undefined;
    try {
      item = JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  if (!item || typeof item !== 'object') return undefined;
  const { url, label, icon, description } = item as Record<string, unknown>;
  if (typeof url !== 'string' || !url.trim()) return undefined;
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    url: normalizeLink(url),
    ...(text(label) ? { label: text(label) } : {}),
    ...(text(icon) ? { icon: text(icon) } : {}),
    ...(text(description) ? { description: text(description) } : {}),
  };
};

/** The entries of a field's value (one or a list) that the field's rules can show, in order */
export const linkEntries = (value: unknown, field?: PostField): LinkEntry[] => {
  const rules = linkRules(field);
  return (Array.isArray(value) ? value : [value])
    .map(parseLinkEntry)
    .filter((entry): entry is LinkEntry => entry !== undefined && isShowableLink(entry.url, rules));
};

/** The links in a field's value (one or a list), `https://` added to bare domains */
export const linksOf = (value: unknown, field?: PostField): string[] =>
  linkEntries(value, field).map((entry) => entry.url);

/** A stored entry: the link alone when it has nothing else */
export const storedEntry = (entry: LinkEntry): string | LinkEntry =>
  entry.label || entry.icon || entry.description ? entry : entry.url;

// ── Plugin definition ───────────────────────────────────────────────

const definition = (id: string): NostrUIPlugin => ({
  id,
  type: ['string', 'object'],

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const rules = linkRules(field);
    const items = Array.isArray(value) ? value : [value];
    const valid = items.every((item) => {
      const entry = parseLinkEntry(item);
      return entry !== undefined && isShowableLink(entry.url, rules);
    });
    return valid
      ? { success: true, data: undefined }
      : {
          success: false,
          error: { field: field.id, message: 'Enter a web link (https://…)', code: 'INVALID_URL' },
        };
  },

  jsonSchema: (field: PostField) => {
    const link = { type: 'string', description: 'A web link (https://…)' };
    return field.metadata?.multiple === true ? { type: 'array', items: link } : link;
  },

  formatValue: (value: unknown): string => linksOf(value).join(', '),

  /** One entry per tag: the link, or the entry as JSON when it has a label or description */
  serializeValue: (value: unknown): string => {
    const entry = parseLinkEntry(value);
    if (!entry) return '';
    const stored = storedEntry(entry);
    return typeof stored === 'string' ? stored : JSON.stringify(stored);
  },

  deserializeValue: (raw: string): unknown => {
    const entry = parseLinkEntry(raw);
    return entry ? storedEntry(entry) : raw;
  },

  /** Profile handles (Bandcamp, Instagram, …): they tell apart entities with the same name */
  qualifiers: (value: unknown): string[] => [
    ...new Set(linksOf(value).flatMap((link) => profileLink(link)?.handle ?? [])),
  ],

  /** Profile links (an artist's Bandcamp, Instagram, …) as NIP-73 `i` tags, in canonical form */
  extraTags: (value: unknown): [string, ...string[]][] =>
    profileUrls(linksOf(value)).map((url): [string, string] => ['i', url]),
});

export const linksPlugin: NostrUIPlugin = definition('links');

/** The same plugin under its former id, for manifests that use `uiPlugin: 'embed'` */
export const embedPlugin: NostrUIPlugin = definition('embed');
