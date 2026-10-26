/**
 * @nostr-post/plugins - Event actions and entity manifests
 *
 * Where plugins, the views and the wiki package meet without depending on each other:
 * - event actions: a plugin's control shown with events made with a manifest it works
 *   with (e.g. the list plugin's Save button for manifests with `lists`), by
 *   `<nostr-post-view>`, `<nostr-wiki-view>` and the venue view;
 * - kind views: a domain package's element for events of its kinds (a calendar event, a list,
 *   a wiki page), shown where a post links such an event (`nostr:naddr…`);
 * - entity manifests: `@nostr-post/wiki` provides how to resolve an entity manifest
 *   reference, for plugins that need one (e.g. the list field finding a venue's lists).
 */

import type { NostrPostManifest } from '@nostr-post/core/types';

/**
 * A plugin's control for events made with a manifest: a custom element with `target`
 * (the event's address, e.g. `30818:<pubkey>:<d-tag>`, or its id) and `manifest`
 */
export interface EventAction {
  /** The control's custom element, e.g. `np-list-save` */
  tagName: string;
  /** Whether it applies to events made with this manifest */
  matches: (manifest: NostrPostManifest) => boolean;
}

// Module state: actions register once when their plugin's web entry loads
const actions: EventAction[] = [];

export function registerEventAction(action: EventAction): void {
  if (!actions.some((a) => a.tagName === action.tagName)) actions.push(action);
}

/** The actions for events made with a manifest, in the order they registered */
export function eventActionsFor(manifest: NostrPostManifest): EventAction[] {
  return actions.filter((a) => a.matches(manifest));
}

/**
 * A domain package's element for events of `kinds`, e.g. `@nostr-post/calendar`'s event card
 * for 31922/31923. A custom element with an `address` property (`kind:pubkey:d-tag`): it loads
 * and shows the event itself.
 */
export interface KindView {
  kinds: number[];
  tagName: string;
}

// Module state: views register once when their package's web entry loads
const kindViews: KindView[] = [];

/** Registers a kind view; a later one for the same kind wins (an app can replace a package's) */
export function registerKindView(view: KindView): void {
  kindViews.unshift(view);
}

/** The view registered for a kind, if any */
export function kindViewFor(kind: number): KindView | undefined {
  return kindViews.find((view) => view.kinds.includes(kind));
}

/** What the wiki package provides about entity manifests */
export interface EntityManifests {
  /** An entity manifest from a reference: a registered id, a `30078:` address, or the manifest */
  resolve: (ref: unknown) => Promise<NostrPostManifest | undefined>;
}

let provided: EntityManifests | undefined;

/** Called by `@nostr-post/wiki` when it loads */
export function provideEntityManifests(manifests: EntityManifests): void {
  provided = manifests;
}

/** Entity manifest resolution, once `@nostr-post/wiki` is loaded */
export const entityManifests = (): EntityManifests | undefined => provided;
