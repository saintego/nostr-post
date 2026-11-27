/**
 * @nostr-post/plugin-links - Link rules
 *
 * How a link shows is data: a list of rules (`LinkRule`), the first one a link matches deciding
 * its format: `embed` (a player in an iframe), `button` (the site's own button), `qr` (a QR code)
 * or `link` (a plain link, also when no rule matches). A rule's `match` is a regular expression
 * whose named groups fill the player's URL template. Text without a scheme that looks like a
 * domain (`ko-fi.com/alice`, `youtube.com/watch?v=…`) is a `https://` link first.
 * No DOM dependencies.
 */

export type LinkFormat = 'embed' | 'button' | 'qr' | 'link';

/** One rule: plain JSON, so apps and manifests can carry their own */
export interface LinkRule {
  /** A rule given again with the same id (by an app or a field) replaces the built-in one */
  id: string;
  /** A regular expression (JavaScript syntax, case-insensitive) a link must match */
  match: string;
  format: LinkFormat;
  /** The site's or provider's name: a button's label, a player's "Play on …" */
  name?: string;
  /** A short id of the provider (`youtube`, `bandcamp`), e.g. for messages and checks */
  provider?: string;
  /** An emoji before the name */
  icon?: string;
  /**
   * `embed`: the player's URL; `{group}` puts in a named group of `match`, `{group|uri}` the same
   * URL-encoded, `{url}` the whole link. Must give an `https:` URL.
   */
  src?: string;
  /** `embed`: a fixed height in pixels (audio players); none: a 16:9 video */
  height?: number;
  /** `button`: the site's colours (hex), so the button looks like the site's own */
  brand?: { background: string; color: string };
}

/** What a link is, by the rule it matched */
export interface LinkView {
  /** The link, `https://` added to a bare domain */
  url: string;
  format: LinkFormat;
  rule?: LinkRule;
  /** `embed`: the player's URL and height */
  src?: string;
  height?: number;
}

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const BARE_DOMAIN =
  /^(?:www\.)?[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)*\.[a-z]{2,}(?:[/?#]\S*)?$/i;
const HEX_COLOR = /^#[\da-f]{3,8}$/i;

/**
 * A link as written: `https://` added to text that is a domain with an optional path
 * (`coff.ee/alice`), other text as it is (trimmed). An `@` is not a domain (an email, a Lightning
 * address), nor is text with spaces.
 */
export const normalizeLink = (text: string): string => {
  const value = text.trim();
  if (!value || SCHEME.test(value) || value.includes('@')) return value;
  return BARE_DOMAIN.test(value) ? `https://${value}` : value;
};

/** Whether a link is one links may show: a web link, or a URI a rule takes (e.g. `bitcoin:`) */
export const isShowableLink = (link: string, rules: readonly LinkRule[]): boolean => {
  const url = normalizeLink(link);
  if (/^https?:\/\/[^\s/?#]+\.[^\s/?#]+/i.test(url) && !/\s/.test(url)) return true;
  return (
    SCHEME.test(url) &&
    !/^(javascript|data|vbscript|file):/i.test(url) &&
    findRule(url, rules) !== undefined
  );
};

const compiled = new Map<string, RegExp | null>();

const regex = (source: string): RegExp | null => {
  let re = compiled.get(source);
  if (re === undefined) {
    try {
      re = new RegExp(source, 'i');
    } catch {
      re = null;
    }
    compiled.set(source, re);
  }
  return re;
};

/** The first rule a link matches, and its named groups */
export const findRule = (
  url: string,
  rules: readonly LinkRule[]
): { rule: LinkRule; groups: Record<string, string> } | undefined => {
  for (const rule of rules) {
    const found = regex(rule.match)?.exec(url);
    if (found) return { rule, groups: { ...(found.groups ?? {}) } };
  }
  return undefined;
};

/** A template filled from a link's groups: `{name}`, `{name|uri}`, `{url}` */
export const fillTemplate = (template: string, url: string, groups: Record<string, string>) =>
  template.replace(/\{(\w+)(\|uri)?\}/g, (_, name: string, encode?: string) => {
    const value = name === 'url' ? url : (groups[name] ?? '');
    return encode ? encodeURIComponent(value) : value;
  });

/**
 * Rules in order of precedence: earlier lists first, a rule's id given again (in an earlier list)
 * replacing the later one
 */
export const mergeRules = (
  ...lists: ReadonlyArray<readonly LinkRule[] | undefined>
): LinkRule[] => {
  const seen = new Set<string>();
  const merged: LinkRule[] = [];
  for (const rule of lists.flatMap((list) => list ?? [])) {
    if (seen.has(rule.id)) continue;
    seen.add(rule.id);
    merged.push(rule);
  }
  return merged;
};

/**
 * Rules a manifest's field may add (`metadata.rules`), read from relays: buttons, QR codes and
 * links only (no players, which load another site's page into the reader's), colours as hex
 */
export const safeFieldRules = (value: unknown): LinkRule[] =>
  (Array.isArray(value) ? value : []).flatMap((item): LinkRule[] => {
    const rule = item as Partial<LinkRule> | null;
    if (!rule || typeof rule.id !== 'string' || typeof rule.match !== 'string') return [];
    if (rule.format !== 'button' && rule.format !== 'qr' && rule.format !== 'link') return [];
    const brand =
      rule.brand && HEX_COLOR.test(rule.brand.background) && HEX_COLOR.test(rule.brand.color)
        ? { brand: { background: rule.brand.background, color: rule.brand.color } }
        : {};
    return [
      {
        id: rule.id,
        match: rule.match,
        format: rule.format,
        ...(typeof rule.name === 'string' ? { name: rule.name } : {}),
        ...(typeof rule.icon === 'string' ? { icon: rule.icon } : {}),
        ...brand,
      },
    ];
  });

/** How a link shows under the rules: its format, and a player's URL and height */
export const viewLink = (link: string, rules: readonly LinkRule[]): LinkView => {
  const url = normalizeLink(link);
  const found = findRule(url, rules);
  if (!found) return { url, format: 'link' };
  const { rule, groups } = found;
  if (rule.format !== 'embed') return { url, format: rule.format, rule };
  const src = rule.src ? fillTemplate(rule.src, url, groups) : undefined;
  // A player only from an https URL; else the link stays a link
  if (!src || !/^https:\/\//i.test(src)) return { url, format: 'link', rule };
  return { url, format: 'embed', rule, src, ...(rule.height ? { height: rule.height } : {}) };
};
