/**
 * Plain text in Djot infobox cells, both ways: values are written escaped so
 * they parse back as the same text, and cells written by other clients (or
 * before escaping) are read back to their source text.
 */

export type AstNode = { tag: string; [key: string]: unknown };

/**
 * Escapes the characters that start Djot inline markup (emphasis, verbatim,
 * links, spans, sub/superscript, autolinks), so a value stays literal text.
 * Smart punctuation (quotes, `--`, `...`) and `:symbols:` stay unescaped for
 * readability: reading restores them from the AST.
 */
export const escapeInline = (text: string): string => text.replace(/[\\`*_{}[\]~^<]/g, '\\$&');

/** Djot inline containers and the markers that wrap their text in the source */
const WRAPPERS: Record<string, string> = {
  emph: '_',
  strong: '*',
  subscript: '~',
  superscript: '^',
  double_quoted: '"',
  single_quoted: "'",
};

/** A node's text as written: smart punctuation, quotes and emphasis keep their source characters */
export function nodeText(node: AstNode): string {
  if (node.tag === 'verbatim' && typeof node.text === 'string') return `\`${node.text}\``;
  if (typeof node.text === 'string') return node.text; // str, smart_punctuation
  if (node.tag === 'soft_break' || node.tag === 'non_breaking_space') return ' ';
  if (node.tag === 'symb' && typeof node.alias === 'string') return `:${node.alias}:`;
  const children = node.children as AstNode[] | undefined;
  if (!Array.isArray(children)) return '';
  const inner = children.map(nodeText).join('');
  const marker = WRAPPERS[node.tag];
  return marker ? `${marker}${inner}${marker}` : inner;
}
