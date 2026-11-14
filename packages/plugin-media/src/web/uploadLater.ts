/**
 * Upload later (#282): a photo is prepared now and uploaded on wifi or when the user asks.
 *
 * Preparing (`prepareUploadLater`): its metadata removed, hashed, its Blossom authorization
 * (kind 24242, scoped to the hash) signed now and valid for a few days. A Blossom file's URL
 * is its hash, so the URL is final before the upload and the post can be signed with it. The
 * file is deferred (`deferUpload`, @nostr-post/outbox): the composer then queues the post with
 * it in the outbox.
 *
 * Without a Blossom server (nostr.build chooses the URL itself), the URL is a placeholder
 * (`pending:<sha256>.<ext>`) and nothing is signed now: the composer queues the post unsigned
 * (sign later), and it's signed once the file is up and its URL known.
 *
 * Uploading (`uploadPrepared`, the outbox's upload job): the file with the authorization signed
 * at capture, with retries, the server storing the same hash; or, for a placeholder, the usual
 * upload (`uploadMedia`, signing then). Resolves with the file's URL.
 */

import { blobUrl, blossomUploadAuth, extensionOf } from '@nostr-post/core/blossom';
import type { MediaFileInfo } from '@nostr-post/core/imeta';
import { deferredUpload, deferUpload, type OutboxUpload } from '@nostr-post/outbox';
import type { MediaPluginConfig } from '../core';
import { sha256Hex } from '../hash';
import { rememberMediaFile } from '../mediaFiles';
import { uploadFailure, uploadTargets } from '../uploadServers';
import { mediaDim, uploadMedia, userServers, withoutMetadata } from './uploadMedia';
import { signWithBrowser, uploadBlossom, withRetries } from './uploadRequest';

/** How long an upload-later authorization is valid (s): the file may wait days for wifi */
export const UPLOAD_LATER_AUTH_SECONDS = 7 * 24 * 60 * 60;

const UPLOAD_LATER_KEY = 'nostr-post:upload-later';

/** Whether the user chose to upload later (remembered in the browser) */
export function prefersUploadLater(): boolean {
  try {
    return localStorage.getItem(UPLOAD_LATER_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberUploadLater(on: boolean): void {
  try {
    localStorage.setItem(UPLOAD_LATER_KEY, on ? '1' : '0');
  } catch {
    // Not remembered
  }
}

/** The Blossom server a file uploaded later goes to: the user's first, else the field's */
export async function uploadLaterServer(
  config: MediaPluginConfig = {}
): Promise<string | undefined> {
  const target = uploadTargets(config, await userServers(config)).find((t) => t.type === 'blossom');
  return target?.type === 'blossom' ? target.server : undefined;
}

/** A file's placeholder URL until it's uploaded (sign later) */
export const pendingUrl = (sha256: string, type: string): string => {
  const ext = extensionOf(type);
  return `pending:${sha256.toLowerCase()}${ext ? `.${ext}` : ''}`;
};

/**
 * Prepares `file` to upload later and defers it: its URL, final with a Blossom server, else a
 * placeholder (`pendingUrl`). Throws `sign-in` without a signer (Blossom)
 */
export async function prepareUploadLater(
  file: File,
  config: MediaPluginConfig = {}
): Promise<MediaFileInfo> {
  const prepared = config.keepMetadata ? file : await withoutMetadata(file);
  const [sha256, dim, server] = await Promise.all([
    sha256Hex(prepared),
    mediaDim(prepared),
    uploadLaterServer(config),
  ]);
  if (!server) return deferUnsigned(file, prepared, sha256, dim, config);
  const auth = await signWithBrowser(
    blossomUploadAuth({
      sha256,
      expiration: Math.floor(Date.now() / 1000) + UPLOAD_LATER_AUTH_SECONDS,
    })
  );
  if (!auth) throw uploadFailure('sign-in', 'Sign in to upload');
  const url = blobUrl(server, sha256, prepared.type);
  const info: MediaFileInfo = {
    url,
    type: prepared.type,
    sha256,
    size: prepared.size,
    ...(dim ? { dim } : {}),
  };
  const upload: OutboxUpload = {
    fileKey: `upload-${sha256}`,
    sha256,
    url,
    server,
    type: prepared.type,
    size: prepared.size,
    name: file.name,
    auth: auth as OutboxUpload['auth'],
  };
  deferUpload(upload, prepared);
  rememberMediaFile(info);
  return info;
}

/** Without a Blossom server: a placeholder URL, nothing signed; uploaded and signed later */
const deferUnsigned = (
  original: File,
  prepared: File,
  sha256: string,
  dim: string | undefined,
  config: MediaPluginConfig
): MediaFileInfo => {
  const url = pendingUrl(sha256, prepared.type);
  deferUpload(
    {
      fileKey: `upload-${sha256}`,
      sha256,
      url,
      server: '',
      type: prepared.type,
      size: prepared.size,
      name: original.name,
      config,
    },
    prepared
  );
  return { url, type: prepared.type, sha256, size: prepared.size, ...(dim ? { dim } : {}) };
};

/**
 * The outbox's upload job: the file with its authorization signed at capture (Blossom), or the
 * usual upload, signing now (a placeholder); its URL. `signal` aborts it (the outbox's Cancel)
 */
export async function uploadPrepared(
  upload: OutboxUpload,
  file: Blob,
  { signal }: { signal?: AbortSignal } = {}
): Promise<string> {
  if (upload.auth) {
    const auth = upload.auth;
    await withRetries(() => uploadBlossom(file, upload.server, upload.sha256, auth, { signal }), {
      signal,
    });
    return upload.url;
  }
  const named = new File([file], upload.name ?? `upload.${upload.type.split('/')[1] ?? 'bin'}`, {
    type: upload.type,
  });
  // Already shrunk and without metadata: uploaded as it is
  const config = { ...((upload.config ?? {}) as MediaPluginConfig), keepMetadata: true };
  return (await uploadMedia(named, { config, signal })).url;
}

// Module state: previews of files not on their server yet, by URL
const previews = new Map<string, string>();

/** A URL to show a file uploaded later from, until it's on its server (the URL itself then) */
export function previewUrl(url: string): string {
  const known = previews.get(url);
  if (known) return known;
  const pending = deferredUpload(url);
  if (!pending || typeof URL.createObjectURL !== 'function') return url;
  const preview = URL.createObjectURL(pending.file);
  previews.set(url, preview);
  return preview;
}
