/**
 * @nostr-post/core - Completions while typing (e.g. `@name` mentions)
 *
 * Finds the word being typed after a trigger character at the caret, and replaces it with
 * the picked completion. Pure functions over the text: any editor can use them.
 */

/** The trigger and the text typed after it, before the caret */
export interface CompletionMatch {
  /** Index of the trigger character */
  start: number;
  /** The caret */
  end: number;
  /** What was typed after the trigger */
  query: string;
}

/** Longest query looked at: past it, the user is no longer picking */
const MAX_QUERY = 40;

/**
 * The completion being typed at `caret`: `trigger` at the start of the text or after
 * whitespace or an opening bracket, then no whitespace up to the caret
 */
export const completionAt = (
  text: string,
  caret: number,
  trigger: string
): CompletionMatch | undefined => {
  const before = text.slice(Math.max(0, caret - MAX_QUERY - 1), caret);
  const start = before.lastIndexOf(trigger);
  if (start < 0) return undefined;
  const query = before.slice(start + trigger.length);
  if (/\s/.test(query) || query.includes(trigger)) return undefined;
  const absolute = caret - before.length + start;
  const previous = absolute > 0 ? text[absolute - 1] : '';
  if (previous && !/[\s([{]/.test(previous)) return undefined;
  return { start: absolute, end: caret, query };
};

/** The text with the match replaced by `insert` and a space, and the caret after them */
export const applyCompletion = (
  text: string,
  match: CompletionMatch,
  insert: string
): { text: string; caret: number } => {
  const after = text.slice(match.end);
  const spaced = after.startsWith(' ') ? insert : `${insert} `;
  return {
    text: text.slice(0, match.start) + spaced + after,
    caret: match.start + spaced.length + (after.startsWith(' ') ? 1 : 0),
  };
};
