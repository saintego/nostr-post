/**
 * A form value as plain text for templates: a reference to another entity
 * (e.g. a picked brewery) becomes that entity's name without its type
 * ("Russian River Brewing (Brewery)" → "Russian River Brewing"), lists are
 * comma-separated, missing values are empty.
 */
export function templateText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(templateText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const ref = value as { displayName?: unknown; dTag?: unknown };
    const name = typeof ref.displayName === 'string' ? ref.displayName : ref.dTag;
    return typeof name === 'string' ? name.replace(/\s*\([^)]*\)\s*$/, '').trim() : '';
  }
  return String(value);
}

/**
 * Replace every `{fieldId}` placeholder in a template string with the
 * corresponding value from formData (see templateText).
 *
 * - Missing or undefined values become an empty string.
 * - After substitution any run of two or more spaces is collapsed to one.
 * - Leading/trailing whitespace is trimmed.
 *
 * Examples:
 *   interpolateTemplate("{name} (Beer)", { name: "Bitcoin" })  → "Bitcoin (Beer)"
 *   interpolateTemplate("{name}-(beer)", { name: "Bitcoin" })  → "Bitcoin-(beer)"
 *   interpolateTemplate("{a} {b}", { a: "Hello" })             → "Hello"
 *   interpolateTemplate("{a} ({b})", { a: "Hello" })           → "Hello"
 */
export function interpolateTemplate(template: string, formData: Record<string, unknown>): string {
  return (
    template
      .replace(/\{(\w+)\}/g, (_, key: string) => templateText(formData[key]))
      // An empty optional part leaves "()" behind: "Café ({city})" without a city
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
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
