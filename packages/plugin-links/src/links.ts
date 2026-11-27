/**
 * @nostr-post/plugin-links - Support links
 *
 * The entries of a "support me" list for people without Lightning or Nostr: links to tip pages
 * (Buy Me a Coffee, GitHub Sponsors, Ko-fi, any `https:` link), on-chain Bitcoin addresses and
 * notes. Pure functions over plain data; no DOM, no requests.
 */

import type { Result } from '@nostr-post/plugins/types';

export type SupportLinkType = 'link' | 'bitcoin' | 'note';

/** One entry of a support list */
export interface SupportLink {
  type: SupportLinkType;
  /** The `https:` link, the Bitcoin address, or the note's text */
  value: string;
  /** Shown instead of the default (the site's name, "Bitcoin") */
  label?: string;
  /** An emoji shown before the label instead of the default */
  icon?: string;
  /** A line under the label, e.g. "Quick and easy way to show support" */
  description?: string;
}

/** A site people tip on: its name, icon and button colours, for links without their own label */
export interface SupportSite {
  label: string;
  icon: string;
  /** The site's button colours (its brand), for a button that looks like the site's own */
  brand?: { background: string; color: string };
}

/**
 * Sites recognised by host (and the start of the path, for GitHub Sponsors). A field's
 * `metadata.sites` adds to them or replaces them, keyed the same way.
 */
export const KNOWN_SUPPORT_SITES: Readonly<Record<string, SupportSite>> = {
  'buymeacoffee.com': {
    label: 'Buy Me a Coffee',
    icon: '☕',
    brand: { background: '#ffdd00', color: '#000000' },
  },
  // Buy Me a Coffee's short links
  'coff.ee': {
    label: 'Buy Me a Coffee',
    icon: '☕',
    brand: { background: '#ffdd00', color: '#000000' },
  },
  'github.com/sponsors': {
    label: 'GitHub Sponsors',
    icon: '💜',
    brand: { background: '#bf3989', color: '#ffffff' },
  },
  'ko-fi.com': { label: 'Ko-fi', icon: '☕', brand: { background: '#29abe0', color: '#ffffff' } },
  'patreon.com': {
    label: 'Patreon',
    icon: '🎨',
    brand: { background: '#ff424d', color: '#ffffff' },
  },
  'liberapay.com': {
    label: 'Liberapay',
    icon: '🤝',
    brand: { background: '#f6c915', color: '#1a171b' },
  },
  'opencollective.com': {
    label: 'Open Collective',
    icon: '🤝',
    brand: { background: '#1f87ff', color: '#ffffff' },
  },
  'paypal.me': { label: 'PayPal', icon: '💳', brand: { background: '#003087', color: '#ffffff' } },
};

export interface LinkError {
  code: 'empty' | 'not-https' | 'bad-address' | 'unknown-type';
  message: string;
}

const fail = (code: LinkError['code'], message: string): Result<never, LinkError> => ({
  success: false,
  error: { code, message },
});

/** A link as a URL when it's `https:`, else undefined (no `http:`, `javascript:` or the like) */
export const httpsUrl = (link: string): URL | undefined => {
  try {
    const url = new URL(link.trim());
    return url.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
};

/** A link's host without `www.`, as links show it */
export const linkHost = (link: string): string =>
  httpsUrl(link)?.hostname.replace(/^www\./, '') ?? '';

/** The known site of a link: by host, or host and the path's first part (`github.com/sponsors`) */
export const supportSite = (
  link: string,
  sites: Readonly<Record<string, SupportSite>> = KNOWN_SUPPORT_SITES
): SupportSite | undefined => {
  const url = httpsUrl(link);
  if (!url) return undefined;
  const host = url.hostname.replace(/^www\./, '');
  const first = url.pathname.split('/').filter(Boolean)[0];
  return (first ? sites[`${host}/${first}`] : undefined) ?? sites[host];
};

// ── Bitcoin addresses ───────────────────────────────────────────────

const BECH32_CHARS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

const polymod = (values: number[]): number => {
  const gen = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    gen.forEach((g, i) => {
      if ((top >>> i) & 1) chk ^= g;
    });
  }
  return chk >>> 0;
};

/** Whether a `bc1…` / `tb1…` address has a valid bech32 (v0) or bech32m (v1+) checksum */
const validSegwit = (address: string): boolean => {
  const lower = address.toLowerCase();
  if (lower !== address && address.toUpperCase() !== address) return false;
  const sep = lower.lastIndexOf('1');
  const hrp = lower.slice(0, sep);
  if (hrp !== 'bc' && hrp !== 'tb') return false;
  const data = [...lower.slice(sep + 1)].map((c) => BECH32_CHARS.indexOf(c));
  if (data.length < 8 || data.some((d) => d < 0)) return false;
  const expanded = [
    ...[...hrp].map((c) => c.charCodeAt(0) >> 5),
    0,
    ...[...hrp].map((c) => c.charCodeAt(0) & 31),
  ];
  const check = polymod([...expanded, ...data]);
  const version = data[0];
  return version === 0 ? check === BECH32_CONST : check === BECH32M_CONST;
};

/** Legacy (`1…`) and script (`3…`) addresses and their testnet forms: format only, no checksum */
const BASE58_ADDRESS = /^[13mn2][1-9A-HJ-NP-Za-km-z]{25,34}$/;

/**
 * A Bitcoin address from text: the address itself or a `bitcoin:` URI (its address, without the
 * amount or other parameters). Segwit addresses (`bc1…`) are checked fully (checksum), legacy
 * ones by their format. Undefined for anything else.
 */
export const bitcoinAddress = (text: string): string | undefined => {
  const bare = text
    .trim()
    .replace(/^bitcoin:/i, '')
    .split('?')[0];
  if (!bare) return undefined;
  if (/^(bc|tb)1/i.test(bare)) return validSegwit(bare) ? bare : undefined;
  return BASE58_ADDRESS.test(bare) ? bare : undefined;
};

/** The `bitcoin:` URI of an address, for a QR code and wallet links */
export const bitcoinUri = (address: string): string => `bitcoin:${address}`;

// ── Entries ─────────────────────────────────────────────────────────

/** Checks an entry: an `https:` link, a Bitcoin address, a note with text */
export const checkSupportLink = (entry: SupportLink): Result<SupportLink, LinkError> => {
  const value = entry.value.trim();
  if (!value) return fail('empty', 'Empty');
  switch (entry.type) {
    case 'link':
      return httpsUrl(value)
        ? { success: true, data: { ...entry, value } }
        : fail('not-https', 'Only https:// links');
    case 'bitcoin': {
      const address = bitcoinAddress(value);
      return address
        ? { success: true, data: { ...entry, value: address } }
        : fail('bad-address', 'Not a Bitcoin address');
    }
    case 'note':
      return { success: true, data: { ...entry, value } };
    default:
      return fail('unknown-type', 'Unknown entry type');
  }
};

const isType = (type: unknown): type is SupportLinkType =>
  type === 'link' || type === 'bitcoin' || type === 'note';

/** An entry from stored data (an object, or its JSON); undefined for anything else */
export const parseSupportLink = (raw: unknown): SupportLink | undefined => {
  let item = raw;
  if (typeof raw === 'string') {
    try {
      item = JSON.parse(raw);
    } catch {
      // A plain link, as a field of links would store it
      return httpsUrl(raw) ? { type: 'link', value: raw.trim() } : undefined;
    }
  }
  if (!item || typeof item !== 'object') return undefined;
  const { type, value, label, icon, description } = item as Record<string, unknown>;
  if (!isType(type) || typeof value !== 'string') return undefined;
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    type,
    value,
    ...(text(label) ? { label: text(label) } : {}),
    ...(text(icon) ? { icon: text(icon) } : {}),
    ...(text(description) ? { description: text(description) } : {}),
  };
};

/** The valid entries of a field's value (one or a list), in order; invalid ones left out */
export const supportLinks = (value: unknown): SupportLink[] =>
  (Array.isArray(value) ? value : [value])
    .map(parseSupportLink)
    .filter((entry): entry is SupportLink => entry !== undefined)
    .map(checkSupportLink)
    .flatMap((checked) => (checked.success ? [checked.data] : []));
