/**
 * @nostr-post/core - NIP-19 entities (bech32), without dependencies
 *
 * Encodes and decodes `naddr` addresses, encodes `nevent` and `npub`, and reads the pubkey of
 * `npub` / `nprofile`.
 */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const polymod = (values: number[]): number => {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GENERATOR[i] as number;
  }
  return chk >>> 0;
};

const hrpExpand = (hrp: string): number[] => [
  ...[...hrp].map((c) => c.charCodeAt(0) >> 5),
  0,
  ...[...hrp].map((c) => c.charCodeAt(0) & 31),
];

/** Regroups bits, e.g. bytes (8) into bech32 words (5) */
const convertBits = (data: number[], from: number, to: number, pad: boolean): number[] | null => {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const max = (1 << to) - 1;
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & max);
    }
  }
  if (pad && bits > 0) out.push((acc << (to - bits)) & max);
  else if (!pad && (bits >= from || ((acc << (to - bits)) & max) !== 0)) return null;
  return out;
};

const hexBytes = (hex: string): number[] =>
  Array.from({ length: hex.length / 2 }, (_, i) =>
    Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  );

/** UTF-8 bytes of a string (core has no DOM or Node types for TextEncoder) */
const utf8 = (text: string): number[] =>
  [...text].flatMap((char) => {
    const c = char.codePointAt(0) as number;
    if (c < 0x80) return [c];
    if (c < 0x800) return [0xc0 | (c >> 6), 0x80 | (c & 63)];
    if (c < 0x10000) return [0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)];
    return [0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)];
  });

/** How many continuation bytes follow a UTF-8 lead byte */
const continuationBytes = (lead: number): number => {
  if (lead >= 0xf0) return 3;
  if (lead >= 0xe0) return 2;
  if (lead >= 0xc0) return 1;
  return 0;
};

/** A string from UTF-8 bytes */
const fromUtf8 = (bytes: number[]): string => {
  const points: number[] = [];
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i] as number;
    const extra = continuationBytes(b);
    let c = extra === 0 ? b : b & (0x3f >> extra);
    for (let j = 1; j <= extra; j++) c = (c << 6) | ((bytes[i + j] as number) & 63);
    points.push(c);
    i += extra + 1;
  }
  return String.fromCodePoint(...points);
};

const tlv = (type: number, value: number[]) => [type, value.length, ...value];

const kindBytes = (kind: number) => [
  (kind >>> 24) & 255,
  (kind >>> 16) & 255,
  (kind >>> 8) & 255,
  kind & 255,
];

/** Relay hints (TLV type 1), at most a few so the entity stays short */
const relayTlv = (relays: string[] = []) => relays.slice(0, 3).flatMap((r) => tlv(1, utf8(r)));

/**
 * An address (`<kind>:<pubkey>:<d-tag>`) as a NIP-19 `naddr`, with up to three relays where
 * it can be found
 */
export function encodeNaddr(address: string, relays?: string[]): string | undefined {
  const match = address.match(/^(\d+):([0-9a-f]{64}):(.*)$/);
  if (!match) return undefined;
  const [, kind, pubkey, identifier] = match as unknown as [string, string, string, string];
  const bytes = [
    ...tlv(0, utf8(identifier)),
    ...relayTlv(relays),
    ...tlv(2, hexBytes(pubkey)),
    ...tlv(3, kindBytes(Number(kind))),
  ];
  return encodeBech32('naddr', bytes);
}

/**
 * An event id as a NIP-19 `nevent`, with up to three relays where it can be found, and its
 * author and kind when given; undefined for anything but a 64-character hex id
 */
export function encodeNevent(
  id: string,
  { relays, author, kind }: { relays?: string[]; author?: string; kind?: number } = {}
): string | undefined {
  if (!/^[0-9a-f]{64}$/.test(id)) return undefined;
  const bytes = [
    ...tlv(0, hexBytes(id)),
    ...relayTlv(relays),
    ...(author && /^[0-9a-f]{64}$/.test(author) ? tlv(2, hexBytes(author)) : []),
    ...(kind === undefined ? [] : tlv(3, kindBytes(kind))),
  ];
  return encodeBech32('nevent', bytes);
}

/** Bytes as a NIP-19 entity with `prefix` (`npub`, `naddr`, …) */
const encodeBech32 = (prefix: string, bytes: number[]): string => {
  const words = convertBits(bytes, 8, 5, true) ?? [];
  const mod = polymod([...hrpExpand(prefix), ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31);
  return `${prefix}1${[...words, ...checksum].map((w) => CHARSET[w]).join('')}`;
};

/** A hex pubkey as a NIP-19 `npub`; undefined for anything but 64 hex characters */
export function encodeNpub(pubkey: string): string | undefined {
  return /^[0-9a-f]{64}$/.test(pubkey) ? encodeBech32('npub', hexBytes(pubkey)) : undefined;
}

/** Bech32 data of a NIP-19 entity: its prefix (`npub`, `naddr`, …) and bytes; undefined if invalid */
const decodeBech32 = (entity: string): { prefix: string; bytes: number[] } | undefined => {
  const lower = entity.toLowerCase();
  const separator = lower.lastIndexOf('1');
  if (separator < 1) return undefined;
  const prefix = lower.slice(0, separator);
  const data = [...lower.slice(separator + 1)].map((c) => CHARSET.indexOf(c));
  if (data.length < 6 || data.some((d) => d < 0)) return undefined;
  if (polymod([...hrpExpand(prefix), ...data]) !== 1) return undefined;
  const bytes = convertBits(data.slice(0, -6), 5, 8, false);
  return bytes ? { prefix, bytes } : undefined;
};

/** NIP-19 TLV entries: every value of each type, in order */
const readTlv = (bytes: number[]): Record<number, number[][]> => {
  const fields: Record<number, number[][]> = {};
  for (let i = 0; i + 1 < bytes.length; ) {
    const type = bytes[i] as number;
    const length = bytes[i + 1] as number;
    fields[type] = [...(fields[type] ?? []), bytes.slice(i + 2, i + 2 + length)];
    i += 2 + length;
  }
  return fields;
};

const toHex = (bytes: number[]): string =>
  bytes.map((b) => b.toString(16).padStart(2, '0')).join('');

/** A NIP-19 `naddr` as an address (`<kind>:<pubkey>:<d-tag>`); undefined if invalid */
export function decodeNaddr(naddr: string): string | undefined {
  const decoded = decodeBech32(naddr);
  if (decoded?.prefix !== 'naddr') return undefined;
  const fields = readTlv(decoded.bytes);
  const [identifier, pubkey, kind] = [fields[0]?.[0], fields[2]?.[0], fields[3]?.[0]];
  if (!identifier || pubkey?.length !== 32 || kind?.length !== 4) return undefined;
  const kindNumber = kind.reduce((acc, b) => acc * 256 + b, 0);
  return `${kindNumber}:${toHex(pubkey)}:${fromUtf8(identifier)}`;
}

export type ProfilePointer = {
  /** Hex pubkey */
  pubkey: string;
  /** Relays the `nprofile` suggests for finding the profile; empty for an `npub` */
  relays: string[];
};

/** The pubkey (and relay hints) of a NIP-19 `npub` or `nprofile`; undefined for other or invalid entities */
export function decodeProfile(entity: string): ProfilePointer | undefined {
  const decoded = decodeBech32(entity);
  if (decoded?.prefix === 'npub') {
    return decoded.bytes.length === 32 ? { pubkey: toHex(decoded.bytes), relays: [] } : undefined;
  }
  if (decoded?.prefix === 'nprofile') {
    const fields = readTlv(decoded.bytes);
    const pubkey = fields[0]?.[0];
    if (pubkey?.length !== 32) return undefined;
    return { pubkey: toHex(pubkey), relays: (fields[1] ?? []).map(fromUtf8) };
  }
  return undefined;
}

/**
 * An LNURL (LUD-01, bech32 with the `lnurl` prefix, e.g. a profile's `lud06`) as the URL it
 * encodes; undefined if invalid or not an `https:` URL (`http:` only for `.onion` hosts)
 */
export function decodeLnurl(lnurl: string): string | undefined {
  const decoded = decodeBech32(lnurl.trim().replace(/^lightning:/i, ''));
  if (decoded?.prefix !== 'lnurl') return undefined;
  const url = fromUtf8(decoded.bytes);
  const onion = /^http:\/\/[^/?#:]+\.onion(?:[/?#:]|$)/i.test(url);
  return /^https:\/\/[^/?#\s]+/i.test(url) || onion ? url : undefined;
}

/** A URL as an LNURL (LUD-01: bech32 with the `lnurl` prefix, in upper case as wallets print it) */
export function encodeLnurl(url: string): string {
  return encodeBech32('lnurl', utf8(url)).toUpperCase();
}
