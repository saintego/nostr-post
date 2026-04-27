/**
 * Replace every `{fieldId}` placeholder in a template string with the
 * corresponding value from formData.
 *
 * - Missing or undefined values become an empty string.
 * - After substitution any run of two or more spaces is collapsed to one.
 * - Leading/trailing whitespace is trimmed.
 *
 * Examples:
 *   interpolateTemplate("{name} (Beer)", { name: "Bitcoin" })  → "Bitcoin (Beer)"
 *   interpolateTemplate("{name}-(beer)", { name: "Bitcoin" })  → "Bitcoin-(beer)"
 *   interpolateTemplate("{a} {b}", { a: "Hello" })             → "Hello"
 */
export function interpolateTemplate(template: string, formData: Record<string, unknown>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => {
      const v = formData[key];
      return v !== undefined && v !== null ? String(v) : '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Returns the list of field IDs referenced in a template string.
 * Useful for determining which fields drive the generated title/d-tag so the
 * composer can decide what to show in the identity preview.
 *
 * Example:
 *   templateFieldIds("{name} (Beer)")    → ["name"]
 *   templateFieldIds("{brand}-{model}")  → ["brand", "model"]
 */
export function templateFieldIds(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}
