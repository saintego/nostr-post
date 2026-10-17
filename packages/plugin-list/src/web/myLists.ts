/**
 * Loading the signed-in user's lists for <np-list-save> and <np-list-input>, step by
 * step so each shows what it waits for: the signer (a remote signer or a permission
 * prompt can take a while), then the relays. The preset lists show as soon as the
 * pubkey is known.
 */

import { clearPublicKeyCache, getPublicKey, hasNostrSigner } from '@nostr-post/signer';
import { html, nothing } from 'lit';
import { type ListPreset, withBookmarks, withPresets } from '../core';
import { fetchLists } from '../lists';
import type { BookmarkList } from '../types';
import type { ListMessages } from './listMessages';

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
  m: ListMessages,
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
  let pubkey: string;
  try {
    pubkey = await withTimeout(getPublicKey(), SIGNER_TIMEOUT_MS);
  } catch (error) {
    // Ask the signer again on retry, instead of waiting for the same request
    clearPublicKeyCache();
    const message = error === TIMED_OUT ? m.signerNoAnswer : m.failed(reason(error));
    update({ waitingForSigner: false, error: message });
    return;
  }
  update({ pubkey, waitingForSigner: false });
  await loadLists(pubkey, relays, m, update);
}

async function loadLists(
  pubkey: string,
  relays: string[] | undefined,
  m: ListMessages,
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

/** What the loading waits for, or why it failed (with a retry) */
export function renderLoadState(state: MyListsState, m: ListMessages, retry: () => void) {
  if (state.error) {
    return html`<div class="error">
      ${state.error}
      <button type="button" @click=${retry}>${m.retry}</button>
    </div>`;
  }
  if (state.waitingForSigner) return html`<div class="muted">${m.waitingForSigner}</div>`;
  if (!state.lists) return html`<div class="muted">${m.loading}</div>`;
  return nothing;
}
