/**
 * Normalize a string to a valid NIP-54 d-tag.
 *
 * Rules (from the NIP-54 spec):
 *   - Lowercase
 *   - Spaces → hyphens
 *   - Remove characters that are not Unicode letters, numbers, or hyphens
 *   - Collapse consecutive hyphens
 *   - Strip leading and trailing hyphens
 */
export function normalizeDTag(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
