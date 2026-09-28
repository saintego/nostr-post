import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/**
 * Validate wiki form data against the manifest's editable fields.
 *
 * A field's plugin `validate` hook wins when present (e.g. wiki-entity-picker);
 * otherwise `required` fields must be non-empty. Fields hidden from editing or
 * attached to another field are skipped since the user cannot fill them.
 *
 * @returns The first error message, or undefined when the form is valid.
 */
export function validateWikiForm(
  manifest: NostrPostManifest,
  formData: Record<string, unknown>
): string | undefined {
  for (const field of manifest.fields) {
    if (field.visibility?.edit === 'hidden' || field.attachTo) continue;
    const value = formData[field.id];
    const plugin = pluginRegistry.get(field.uiPlugin);
    if (plugin?.validate) {
      const result = plugin.validate(value, field);
      if (!result.success) return result.error.message;
      continue;
    }
    if (field.required && isEmpty(value)) {
      const label = (field.metadata?.label as string | undefined) ?? field.id;
      return `${label} is required`;
    }
  }
  return undefined;
}
