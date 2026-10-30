/**
 * A string as a NIP-54 d-tag: core's `nip54DTag` (lowercase, whitespace → hyphens, punctuation
 * removed, letters of any script and numbers kept, no repeated or edge hyphens).
 */
export { nip54DTag as normalizeDTag } from '@nostr-post/core/textNormalize';
