/**
 * @nostr-post/plugin-reference - Core
 *
 * Extracts external links (r tags) and nostr identity references (p/q/a tags)
 * from an attached field's value. Designed to attach to another field via
 * the PostField.attachTo property.
 *
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField } from '@nostr-post/plugins/types';
import { nip19 } from 'nostr-tools';

export interface ReferencePluginConfig {
  /**
   * URL deduplication strategy (default: 'normalized').
   * - 'exact': match raw URL strings
   * - 'normalized': match after stripping tracking params
   * - 'origin-path': match by origin + pathname only (ignores query string)
   */
  urlDedupeMode?: 'exact' | 'normalized' | 'origin-path';
  /**
   * Field ID to read content from. Deprecated — prefer PostField.attachTo.
   * Only used for legacy manifests that do not set attachTo.
   */
  enrichFrom?: string;
}

/** Internal structured value stored (as JSON) in the reference field. */
export interface ReferenceValue {
  urls: string[];
  p: string[]; // pubkeys from npub/nprofile mentions
  q: string[]; // event IDs from note/nevent quotes
  a: string[]; // addr values (kind:pubkey:d) from naddr references
}

// ── URL helpers ──────────────────────────────────────────────────────────────

const TRACKING_PARAM_RE = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|ref_src$)/i;

const trimTrailingPunctuation = (url: string): string => {
  let s = url;
  while (/[.,!?;:]$/.test(s)) s = s.slice(0, -1);
  while (s.endsWith(')') && (s.match(/\(/g)?.length ?? 0) < (s.match(/\)/g)?.length ?? 0)) {
    s = s.slice(0, -1);
  }
  return s;
};

export const normalizeExternalUrl = (rawUrl: string): string => {
  const match = rawUrl.match(/^(https?):(\/\/[^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i);
  if (!match) return rawUrl;

  const scheme = match[1].toLowerCase();
  let authority = match[2].toLowerCase();
  const path = match[3] || '';
  const query = match[4] || '';

  // Strip default ports
  authority = authority.replace(/:443$/, scheme === 'https' ? '' : ':443');
  authority = authority.replace(/:80$/, scheme === 'http' ? '' : ':80');

  // Strip tracking query params
  const cleanQuery = query
    ? query
        .slice(1)
        .split('&')
        .filter(Boolean)
        .filter((p) => !TRACKING_PARAM_RE.test(p.split('=')[0] ?? ''))
        .join('&')
    : '';

  return `${scheme}:${authority}${path || '/'}${cleanQuery ? '?' + cleanQuery : ''}`;
};

const urlDedupeKey = (
  normalized: string,
  mode: ReferencePluginConfig['urlDedupeMode'] = 'normalized'
): string => {
  if (mode === 'origin-path') {
    const m = normalized.match(/^(https?:\/\/[^/?#]+\/[^?#]*)/);
    return m ? m[1] : normalized;
  }
  return normalized; // 'normalized' and 'exact' both use normalized here; exact deduped separately
};

const extractUrls = (
  content: string,
  dedupeMode: ReferencePluginConfig['urlDedupeMode'] = 'normalized'
): string[] => {
  const matches = content.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of matches) {
    const trimmed = trimTrailingPunctuation(raw);
    if (!trimmed) continue;
    const normalized = normalizeExternalUrl(trimmed);
    const key = dedupeMode === 'exact' ? trimmed : urlDedupeKey(normalized, dedupeMode);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
};

// ── Nostr identifier helpers ─────────────────────────────────────────────────

const extractNostrRefs = (content: string): Pick<ReferenceValue, 'p' | 'q' | 'a'> => {
  const re =
    /(?:\bnostr:)?((?:npub1|nprofile1|note1|nevent1|naddr1)[023456789acdefghjklmnpqrstuvwxyz]+)/gi;

  const p: string[] = [];
  const q: string[] = [];
  const a: string[] = [];
  const seen = new Set<string>();

  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard while-exec pattern
  while ((m = re.exec(content)) !== null) {
    const id = m[1].toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      const decoded = nip19.decode(id);
      if (decoded.type === 'npub') p.push(decoded.data);
      else if (decoded.type === 'nprofile') p.push(decoded.data.pubkey);
      else if (decoded.type === 'note') q.push(decoded.data);
      else if (decoded.type === 'nevent') q.push(decoded.data.id);
      else if (decoded.type === 'naddr')
        a.push(`${decoded.data.kind}:${decoded.data.pubkey}:${decoded.data.identifier}`);
    } catch {
      // skip malformed identifiers
    }
  }

  return { p, q, a };
};

// ── Value codec ──────────────────────────────────────────────────────────────

const EMPTY: ReferenceValue = { urls: [], p: [], q: [], a: [] };

const decode = (raw: unknown): ReferenceValue => {
  if (typeof raw === 'string' && raw.startsWith('{')) {
    try {
      return JSON.parse(raw) as ReferenceValue;
    } catch {
      /* fall through */
    }
  }
  return { ...EMPTY };
};

// ── Plugin ────────────────────────────────────────────────────────────────────

export const referencePlugin: NostrUIPlugin = {
  id: 'reference',
  type: 'string',

  enrichFormData: (
    formData: Record<string, unknown>,
    field: PostField
  ): Record<string, unknown> => {
    const config = (field.metadata as ReferencePluginConfig) ?? {};
    // Resolve source field by manifest field ID. No implicit default.
    const targetField = field.attachTo ?? config.enrichFrom;
    if (!targetField) return {};

    const content =
      typeof formData[targetField] === 'string' ? (formData[targetField] as string) : '';
    if (!content) return {};

    const existing = decode(formData[field.id]);
    const dedupeMode = config.urlDedupeMode ?? 'normalized';

    // Merge new URLs with existing, deduped
    const existingUrlKeys = new Set(
      existing.urls.map((u) => urlDedupeKey(normalizeExternalUrl(u), dedupeMode))
    );
    const newUrls = extractUrls(content, dedupeMode).filter(
      (u) => !existingUrlKeys.has(urlDedupeKey(u, dedupeMode))
    );

    // Merge nostr references
    const { p, q, a } = extractNostrRefs(content);
    const existingP = new Set(existing.p);
    const existingQ = new Set(existing.q);
    const existingA = new Set(existing.a);

    const newP = p.filter((x) => !existingP.has(x));
    const newQ = q.filter((x) => !existingQ.has(x));
    const newA = a.filter((x) => !existingA.has(x));

    if (!newUrls.length && !newP.length && !newQ.length && !newA.length) return {};

    const merged: ReferenceValue = {
      urls: [...existing.urls, ...newUrls],
      p: [...existing.p, ...newP],
      q: [...existing.q, ...newQ],
      a: [...existing.a, ...newA],
    };

    return { [field.id]: JSON.stringify(merged) };
  },

  /**
   * Return '' to suppress coordinator's default tag emission for this field.
   * All tags (r, p, q, a) are emitted via extraTags instead.
   */
  serializeValue: () => '',

  validate: () => ({ success: true, data: undefined }),

  /**
   * Emit r (URLs), p (mentions), q (quotes), a (address references) tags.
   * Called by the coordinator / composer after enrichment.
   */
  extraTags: (value): [string, ...string[]][] => {
    const v = decode(value);
    return [
      ...(v.urls ?? []).map((url) => ['r', url] as [string, string]),
      ...(v.p ?? []).map((pubkey) => ['p', pubkey] as [string, string]),
      ...(v.q ?? []).map((id) => ['q', id] as [string, string]),
      ...(v.a ?? []).map((addr) => ['a', addr] as [string, string]),
    ];
  },

  formatValue: (value): string => {
    const v = decode(value);
    return [...(v.urls ?? []), ...(v.p ?? []).map((pk) => `@${pk.slice(0, 8)}…`)].join(', ');
  },

  deserializeValue: (raw) => raw, // stored as JSON string
};
