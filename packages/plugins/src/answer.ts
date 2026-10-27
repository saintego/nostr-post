/**
 * @nostr-post/plugins - Filling a post in from a JSON answer
 *
 * `@nostr-post/core/formDataSchema` with the field plugins: each plugin describes its field's
 * value (`valueSchema`) and turns the answer's value into the field's (`fromAnswer`), e.g. an
 * AI's structured answer about a post into a composer's prefill.
 */

import {
  formDataFromAnswer,
  formDataSchema,
  type JsonSchema,
} from '@nostr-post/core/formDataSchema';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from './registry';
import type { NostrUIPlugin } from './types';

type GetPlugin = (id: string) => NostrUIPlugin | undefined;

const defaultGetPlugin: GetPlugin = (id) => pluginRegistry.get(id);

/**
 * The JSON Schema of `manifest`'s form data, with the registered plugins' value schemas.
 * Fields of a plugin without `valueSchema` are left out; fields without a plugin (built-in
 * inputs: text, textarea, number, select) get their type's schema.
 */
export const answerSchema = (
  manifest: NostrPostManifest,
  getPlugin: GetPlugin = defaultGetPlugin
): JsonSchema =>
  formDataSchema(manifest, {
    valueSchema: (field) => {
      const plugin = getPlugin(field.uiPlugin);
      if (!plugin) return undefined;
      return plugin.valueSchema ? plugin.valueSchema(field) : null;
    },
  });

/** An answer turned into form data */
export interface AnswerFormData {
  /** The publish format the answer chose, if any */
  formatId?: string;
  formData: Record<string, unknown>;
  /** Per field, what its plugin couldn't turn into a value (e.g. names without a page) */
  unresolved: Record<string, string[]>;
}

/**
 * Form data from an answer in `answerSchema`'s shape: empty values dropped, and each
 * plugin's `fromAnswer` applied (they may look things up on relays).
 */
export const answerToFormData = async (
  manifest: NostrPostManifest,
  answer: unknown,
  getPlugin: GetPlugin = defaultGetPlugin
): Promise<AnswerFormData> => {
  const { formatId, formData } = formDataFromAnswer(manifest, answer);
  const unresolved: Record<string, string[]> = {};
  const resolved = { ...formData };
  await Promise.all(
    manifest.fields.map(async (field) => {
      const fromAnswer = getPlugin(field.uiPlugin)?.fromAnswer;
      if (!fromAnswer || !(field.id in formData)) return;
      const result = await fromAnswer(formData[field.id], field);
      if (result.value === undefined) delete resolved[field.id];
      else resolved[field.id] = result.value;
      if (result.unresolved?.length) unresolved[field.id] = result.unresolved;
    })
  );
  return { ...(formatId ? { formatId } : {}), formData: resolved, unresolved };
};
