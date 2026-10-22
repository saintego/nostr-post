/**
 * @nostr-post/plugin-list - loading the signed-in user's lists
 *
 * Step by step, so a UI can show what it waits for: the signer (a remote signer or a
 * permission prompt can take a while), then the relays. The manifest's lists show as soon
 * as the pubkey is known. Framework-free: <np-list-save> and <np-list-input> use it, and so
 * can any other UI.
 */

import { clearPublicKeyCache, getPublicKey, hasNostrSigner } from '@nostr-post/signer';
import { type ListPreset, withBookmarks, withPresets } from './core';
import { fetchLists } from './lists';
import type { BookmarkList } from './types';
/** The words loading needs (error messages) */
export interface MyListsMessages {
  noSigner: string;
  /** The signer didn't give the pubkey in time */
  signerNoAnswer: string;
  failed: (reason: string) => string;
}

export interface MyListsState {
  /** Empty until the signer answered */
  pubkey: string;
  /** The user's lists; null while loading */
  lists: BookmarkList[] | null;
  waitingForSigner: boolean;
  error: string;
}

export const NOT_LOADED: MyListsState = {
  pubkey: '',
  lists: null,
  waitingForSigner: false,
  error: '',
};

/** How long to wait for the signer's pubkey before offering to try again */
export const SIGNER_TIMEOUT_MS = 20_000;

const TIMED_OUT = Symbol('timed out');

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(TIMED_OUT), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Loads the user's lists, reporting each step through `update`. With `knownPubkey` (e.g.
 * the composer's) the signer isn't asked.
 */
export async function loadMyLists(
  relays: string[] | undefined,
  m: MyListsMessages,
  update: (patch: Partial<MyListsState>) => void,
  knownPubkey?: string
): Promise<void> {
  if (knownPubkey) {
    update({ ...NOT_LOADED, pubkey: knownPubkey });
    await loadLists(knownPubkey, relays, m, update);
    return;
  }
  if (!hasNostrSigner()) {
    update({ error: m.noSigner });
    return;
  }
  update({ ...NOT_LOADED, waitingForSigner: true });
  const request = getPublicKey();
  let pubkey: string;
  try {
    pubkey = await withTimeout(request, SIGNER_TIMEOUT_MS);
  } catch (error) {
    if (error !== TIMED_OUT) {
      update({ waitingForSigner: false, error: m.failed(reason(error)) });
      return;
    }
    // Ask the signer again on retry, instead of waiting for the same request
    clearPublicKeyCache();
    update({ waitingForSigner: false, error: m.signerNoAnswer });
    // It may still answer, e.g. once the user signed in: then load without a retry
    pubkey = await request.catch(() => '');
    if (!pubkey) return;
  }
  update({ pubkey, waitingForSigner: false, error: '' });
  await loadLists(pubkey, relays, m, update);
}

async function loadLists(
  pubkey: string,
  relays: string[] | undefined,
  m: MyListsMessages,
  update: (patch: Partial<MyListsState>) => void
): Promise<void> {
  try {
    update({ lists: await fetchLists(pubkey, { relays }) });
  } catch (error) {
    update({ error: m.failed(reason(error)) });
  }
}

/** The lists to offer: the presets first (also while the user's lists load), then theirs */
export const shownLists = (state: MyListsState, presets: ListPreset[]): BookmarkList[] =>
  state.pubkey
    ? withPresets(state.lists ?? withBookmarks([], state.pubkey), presets, state.pubkey)
    : [];
