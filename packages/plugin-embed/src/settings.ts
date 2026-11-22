/**
 * @nostr-post/plugin-embed - The app's settings for players
 *
 * `showUrl`: a link with a player shows its URL under the player too (default). An app turns it
 * off with `configureEmbedPlugin({ showUrl: false })`, a field with `metadata.showUrl: false`.
 * No DOM dependencies.
 */

import type { PostField } from '@nostr-post/plugins/types';

export interface EmbedPluginSettings {
  /** Show a player's link under it (default true) */
  showUrl?: boolean;
}

// Module state: the app's settings, set once at start
let settings: EmbedPluginSettings = {};

/** Sets the app's settings for players (merged with earlier ones) */
export function configureEmbedPlugin(next: EmbedPluginSettings): void {
  settings = { ...settings, ...next };
}

/** The app's settings for players */
export const embedSettings = (): EmbedPluginSettings => settings;

/**
 * Whether a player shows its link: the element's own choice, else the field's
 * `metadata.showUrl`, else the app's setting, else yes
 */
export const showsUrl = (field?: PostField, own?: boolean): boolean =>
  own ?? (field?.metadata?.showUrl as boolean | undefined) ?? settings.showUrl ?? true;

/** A link as shown under its player: host and path, without the scheme, `www.` and a last `/` */
export const linkText = (url: string): string =>
  url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
