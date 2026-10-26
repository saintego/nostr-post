/**
 * @nostr-post/list - the list field (`uiPlugin: "list"`)
 *
 * A field of a post manifest where the author picks lists; once the post is published,
 * its afterPublish hook saves to them the wiki entity of the field named by
 * `metadata.saveField` (e.g. the review's venue, whose page the venue field may just
 * have created), or without it the post itself. Nothing is added to the post's events.
 * With a hooks-only publish format (`kinds: []`) a manifest only saves, e.g. a place.
 *
 * The lists offered first: the saved entity's manifest's `lists`, or without
 * `saveField` the post manifest's own.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { entityManifests } from '@nostr-post/plugins/entities';
import type { NostrUIPlugin, PostField } from '@nostr-post/plugins/types';
import {
  entityItems,
  itemForEvent,
  type ListPreset,
  listAddress,
  listAtAddress,
  manifestListPresets,
} from './core';
import { addItemsToList, createList } from './lists';
import { BOOKMARK_SET_KIND, type ListItem } from './types';

/** A list the field saves to: one by address (the user's, or a preset), or a new one */
export interface ListChoice {
  address?: string;
  title?: string;
}

const NEW = 'new:';

/** The field's value: list addresses, and `new:<title>` for lists to create */
export const choiceValue = (choice: ListChoice): string =>
  choice.address ?? `${NEW}${choice.title ?? ''}`;

export const listChoices = (value: unknown): ListChoice[] =>
  (Array.isArray(value) ? value : [])
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((v) => (v.startsWith(NEW) ? { title: v.slice(NEW.length) } : { address: v }));

/**
 * The lists to offer first: the entity manifest of `metadata.saveField` (a venue field's
 * `wikiEntity`, a picker's `entityManifest`), resolved by `@nostr-post/wiki`; without
 * `saveField`, the post manifest's own
 */
export async function fieldPresets(
  field: PostField | null,
  manifest: NostrPostManifest | undefined
): Promise<ListPreset[]> {
  const saveField = field?.metadata?.saveField;
  if (typeof saveField !== 'string') return manifestListPresets(manifest);
  const target = manifest?.fields.find((f) => f.id === saveField);
  const ref = target?.metadata?.wikiEntity ?? target?.metadata?.entityManifest;
  const resolver = entityManifests();
  if (!ref || !resolver) return [];
  return manifestListPresets(await resolver.resolve(ref).catch(() => undefined));
}

/** What the field saves: the entity of `metadata.saveField`, else the post's first event */
export function itemsToSave(
  field: PostField,
  ctx: { formData: Record<string, unknown>; events: Array<Parameters<typeof itemForEvent>[0]> }
): ListItem[] {
  const saveField = field.metadata?.saveField;
  if (typeof saveField === 'string') return entityItems(ctx.formData[saveField]);
  const item = ctx.events[0] && itemForEvent(ctx.events[0]);
  return item ? [item] : [];
}

/**
 * Save `items` to every choice; throws with what failed. A preset list the user hasn't
 * got yet is created with the preset's title (`presets`, for `pubkey`).
 */
export async function saveToChoices(
  choices: ListChoice[],
  items: ListItem[],
  options: { relays?: string[]; presets?: ListPreset[]; pubkey?: string } = {}
): Promise<void> {
  if (items.length === 0 || choices.length === 0) return;
  const titleOf = (address: string) =>
    options.presets?.find(
      (p) => options.pubkey && listAddress(BOOKMARK_SET_KIND, options.pubkey, p.dTag) === address
    )?.label;
  const failed: string[] = [];
  for (const choice of choices) {
    const list = choice.address
      ? listAtAddress(choice.address, choice.title ?? titleOf(choice.address))
      : null;
    const result = list
      ? await addItemsToList(list, items, options)
      : await createList({ title: choice.title ?? '', items }, options);
    if (!result.success) failed.push(`${choice.title ?? choice.address}: ${result.error.message}`);
  }
  if (failed.length > 0) throw new Error(`Saving to lists failed (${failed.join('; ')})`);
}

/**
 * A list field for a manifest: saves the entity of `saveField` (a venue, a picked beer),
 * or without it the post, to the lists the author ticks. The input explains itself, so
 * the field needs only a label.
 */
export const listField = (options: {
  saveField?: string;
  label: string;
  id?: string;
  required?: boolean;
}): PostField => ({
  id: options.id ?? `${options.saveField ?? 'post'}_lists`,
  type: 'string',
  uiPlugin: 'list',
  // Nothing goes into the post (serializeValue is ''); a mapping is required, though
  mapTo: { kind: 1, target: 'tag', tagName: 'lists' },
  required: options.required,
  metadata: {
    label: options.label,
    ...(options.saveField ? { saveField: options.saveField } : {}),
  },
});

export const listFieldPlugin: NostrUIPlugin = {
  id: 'list',
  type: 'string',
  // The lists aren't part of the post
  serializeValue: () => '',
  formatValue: (value) =>
    listChoices(value)
      .map((c) => c.title ?? c.address)
      .join(', '),
  afterPublish: async (value, field, ctx) => {
    const relays = field.metadata?.relays;
    await saveToChoices(listChoices(value), itemsToSave(field, ctx), {
      relays: Array.isArray(relays) ? (relays as string[]) : undefined,
      presets: await fieldPresets(field, ctx.manifest),
      pubkey: ctx.pubkey,
    });
  },
};
