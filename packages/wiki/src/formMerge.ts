/**
 * @nostr-post/wiki - Adding values to a page's form data
 *
 * E.g. links a post has that the page of its musician doesn't: a list field gets the new items
 * after its own (no repeats), an empty field gets the value, a filled one keeps its own. No DOM
 * dependencies.
 */

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

/** A field's value with an added one: the added if it's empty, both lists' items, else its own */
const addValue = (own: unknown, added: unknown): unknown => {
  if (isEmpty(added)) return own;
  if (isEmpty(own)) return added;
  if (!Array.isArray(own) && !Array.isArray(added)) return own;
  const items = asList(own);
  return [...items, ...asList(added).filter((item) => !items.includes(item))];
};

/** `formData` with `additions` added: lists extended, empty fields filled, others kept */
export const addToFormData = (
  formData: Record<string, unknown>,
  additions: Record<string, unknown> = {}
): Record<string, unknown> => {
  const merged = { ...formData };
  for (const [fieldId, added] of Object.entries(additions)) {
    merged[fieldId] = addValue(merged[fieldId], added);
  }
  return merged;
};
