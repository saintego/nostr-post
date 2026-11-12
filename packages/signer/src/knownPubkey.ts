/**
 * Who is signed in, as far as the app already knows, without asking the signer: views that
 * mark the user's own things (their RSVP, their posts) read it, so they don't open a signer
 * prompt or a sign-in just to look. Set when the signer answers `getPublicKey`, on nostr-login's
 * sign-in and sign-out (`nlAuth`), and by apps with their own sign-in (`setKnownPublicKey`).
 */

/** Fired on `document` when the known pubkey changes; `detail` is the pubkey, or null for no one */
export const KNOWN_PUBKEY_EVENT = 'nostr-post:known-pubkey';

let known: string | undefined;

/** The signed-in user's pubkey if the app knows it; undefined otherwise (not asked for) */
export const knownPublicKey = (): string | undefined => known;

/** Tell who is signed in (undefined: no one), e.g. from an app's own sign-in */
export function setKnownPublicKey(pubkey: string | undefined): void {
  const next = pubkey || undefined;
  if (next === known) return;
  known = next;
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent(KNOWN_PUBKEY_EVENT, { detail: next }));
  }
}

/** Calls `listener` with the known pubkey whenever it changes; returns the unsubscribe */
export function onKnownPublicKeyChange(listener: (pubkey: string | undefined) => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const handler = (e: Event) => listener((e as CustomEvent<string | null>).detail ?? undefined);
  document.addEventListener(KNOWN_PUBKEY_EVENT, handler);
  return () => document.removeEventListener(KNOWN_PUBKEY_EVENT, handler);
}
