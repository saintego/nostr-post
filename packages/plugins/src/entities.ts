/**
 * @nostr-post/plugins - Event actions and entity manifests
 *
 * Where plugins, the views and the wiki package meet without depending on each other:
 * - event actions: a plugin's control shown with events made with a manifest it works
 *   with (e.g. the list plugin's Save button for manifests with `lists`), by
 *   `<nostr-post-view>`, `<nostr-wiki-view>` and the venue view;
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
