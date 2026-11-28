/**
 * @nostr-post/plugin-links - The app's settings
 *
 * - `rules`: the app's own link rules, before the built-in ones (an id given again replaces the
 *   built-in rule): players of other sites, more tip sites, other formats.
 * - `showUrl`: a link with a player shows its URL under the player too (default); a field turns
 *   it off with `metadata.showUrl: false`.
 * - `embedHosts`: the hosts whose players a manifest's field may use (default
 *   `DEFAULT_EMBED_HOSTS`, the built-in players'), to allow players we don't list.
 *
 * A field adds rules in `metadata.rules` (manifests come from relays: players only from
 * `embedHosts`, see `safeFieldRules`). No DOM dependencies.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { DEFAULT_EMBED_HOSTS, DEFAULT_LINK_RULES } from './defaultRules';
import { type LinkRule, mergeRules, safeFieldRules } from './rules';

export interface LinksSettings {
  /** The app's link rules, before the built-in ones */
  rules?: LinkRule[];
  /** Show a player's link under it (default true) */
  showUrl?: boolean;
  /** Hosts whose players manifests' fields may use (replaces `DEFAULT_EMBED_HOSTS`) */
  embedHosts?: string[];
}

// Module state: the app's settings, set once at start
let settings: LinksSettings = {};

/** Sets the app's settings for links (merged with earlier ones) */
export function configureLinks(next: LinksSettings): void {
  settings = { ...settings, ...next };
}

/** The app's settings for links */
export const linksSettings = (): LinksSettings => settings;

/** The rules of a field: its own (`metadata.rules`), then the app's, then the built-in ones */
export const linkRules = (field?: PostField): LinkRule[] =>
  mergeRules(
    safeFieldRules(field?.metadata?.rules, settings.embedHosts ?? DEFAULT_EMBED_HOSTS),
    settings.rules,
    DEFAULT_LINK_RULES
  );

/**
 * Whether a player shows its link: the element's own choice, else the field's
 * `metadata.showUrl`, else the app's setting, else yes
 */
export const showsUrl = (field?: PostField, own?: boolean): boolean =>
  own ?? (field?.metadata?.showUrl as boolean | undefined) ?? settings.showUrl ?? true;

/** A link as shown under its player: host and path, without the scheme, `www.` and a last `/` */
export const linkText = (url: string): string =>
  url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
