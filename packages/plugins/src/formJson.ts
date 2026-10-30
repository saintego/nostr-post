/**
 * @nostr-post/plugins - A manifest's form data as JSON, with the field plugins
 *
 * `@nostr-post/core/formJson` with the registered plugins: each plugin describes its field's
 * value (`jsonSchema`) and turns the JSON's value into the field's (`parseJson`). E.g. an AI's
 * structured output about a post becomes a composer's prefill.
 */

import {
  formJsonSchema as coreFormJsonSchema,
  parseFormJson as coreParseFormJson,
  type FormJson,
  type JsonSchema,
} from '@nostr-post/core/formJson';
import type { NostrPostManifest, Result } from '@nostr-post/core/types';
import { pluginRegistry } from './registry';
import type { FormJsonSuggestion, NostrUIPlugin } from './types';

type GetPlugin = (id: string) => NostrUIPlugin | undefined;

const defaultGetPlugin: GetPlugin = (id) => pluginRegistry.get(id);

/**
 * The JSON Schema of `manifest`'s form data, with the registered plugins' schemas. Fields of a
 * plugin without `jsonSchema` are left out; fields without a plugin (built-in inputs: text,
 * textarea, number, select) get their type's schema.
 */
export const formJsonSchema = (
  manifest: NostrPostManifest,
  getPlugin: GetPlugin = defaultGetPlugin
): JsonSchema =>
  coreFormJsonSchema(manifest, {
    fieldSchema: (field) => {
      const plugin = getPlugin(field.uiPlugin);
      if (!plugin) return undefined;
      return plugin.jsonSchema ? plugin.jsonSchema(field) : null;
    },
  });

/** Form data parsed from JSON, with what the user may do next */
export interface ParsedFormJson extends FormJson {
  /** Per field, its plugin's suggestions (e.g. create the page of a name that has none) */
  suggestions: Record<string, FormJsonSuggestion[]>;
}

/**
 * Form data from JSON in `formJsonSchema`'s shape (text, possibly wrapped in prose or code
 * fences, or already parsed): empty values dropped, and each plugin's `parseJson` applied
 * (they may look things up on relays).
 */
export const parseFormJson = async (
  manifest: NostrPostManifest,
  input: unknown,
  getPlugin: GetPlugin = defaultGetPlugin
): Promise<Result<ParsedFormJson>> => {
  const parsed = coreParseFormJson(manifest, input);
  if (!parsed.success) return parsed;
  const { formData } = parsed.data;
  const suggestions: Record<string, FormJsonSuggestion[]> = {};
  const resolved = { ...formData };
  await Promise.all(
    manifest.fields.map(async (field) => {
      const parseJson = getPlugin(field.uiPlugin)?.parseJson;
      if (!parseJson || !(field.id in formData)) return;
      const result = await parseJson(formData[field.id], field);
      if (result.value === undefined) delete resolved[field.id];
      else resolved[field.id] = result.value;
      if (result.suggestions?.length) suggestions[field.id] = result.suggestions;
    })
  );
  return { success: true, data: { ...parsed.data, formData: resolved, suggestions } };
};
