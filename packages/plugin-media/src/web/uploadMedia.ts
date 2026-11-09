/**
 * Uploading one media file where it belongs: the user's Blossom servers (their kind 10063
 * list), the field's, then nostr.build (`uploadTargets`). The photo's metadata (location
 * included) is removed first, unless the field keeps it (`keepMetadata`); its hash and size are taken before it leaves the device, and what
 * is known about it is remembered for its `imeta` tag (`rememberMediaFile`).
 */

import { blossomUploadAuth } from '@nostr-post/core/blossom';
import { dimOf, type MediaFileInfo } from '@nostr-post/core/imeta';
import { fetchBlossomServers } from '@nostr-post/signer';
import type { MediaPluginConfig } from '../core';
import { stripJpegMetadata } from '../exif';
import { sha256Hex } from '../hash';
import { rememberMediaFile } from '../mediaFiles';
import {
  targetHost,
  tryNextServer,
  type UploadTarget,
  uploadFailure,
  uploadFailureKind,
  uploadTargets,
} from '../uploadServers';
import {
  type RetryOptions,
  signerPubkey,
  signWithBrowser,
  uploadBlossom,
  uploadNip96,
  withRetries,
} from './uploadRequest';

/** How long an upload's Blossom authorization is valid (s): its retries and other servers */
export const BLOSSOM_AUTH_SECONDS = 60 * 60;

/** How long to wait for the user's server list before uploading without it (ms) */
const SERVER_LIST_WAIT_MS = 4_000;

/** The file without its metadata, if it's a JPEG that has some (EXIF location, XMP) */
export async function withoutMetadata(file: File): Promise<File> {
  if (file.type !== 'image/jpeg') return file;
  const { bytes, removed } = stripJpegMetadata(new Uint8Array(await file.arrayBuffer()));
  return removed ? new File([bytes.slice()], file.name, { type: file.type }) : file;
}

/** An image's size in pixels (`1200x800`), as shown (its orientation applied); undefined for others */
export async function imageDim(file: Blob): Promise<string | undefined> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return undefined;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const dim = dimOf(bitmap.width, bitmap.height);
    bitmap.close();
    return dim;
  } catch {
    return undefined;
  }
}

/** A video's `WxH`, from its metadata (as it plays, rotation applied); undefined if unknown */
export function videoDim(file: Blob): Promise<string | undefined> {
  if (!file.type.startsWith('video/') || typeof document === 'undefined') {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (dim?: string) => {
      URL.revokeObjectURL(url);
      resolve(dim);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => done(dimOf(video.videoWidth, video.videoHeight));
    video.onerror = () => done();
    video.src = url;
  });
}

/** A photo's or a video's `WxH` */
export const mediaDim = (file: Blob): Promise<string | undefined> =>
  file.type.startsWith('video/') ? videoDim(file) : imageDim(file);

/** The user's Blossom servers, unless the field leaves them out or the list doesn't come in time */
export const userServers = async (config: MediaPluginConfig): Promise<string[]> => {
  if (config.userServers === false) return [];
  const pubkey = await signerPubkey(SERVER_LIST_WAIT_MS);
  if (!pubkey) return [];
  const timeout = new Promise<string[]>((resolve) =>
    setTimeout(() => resolve([]), SERVER_LIST_WAIT_MS)
  );
  return Promise.race([fetchBlossomServers(pubkey).catch(() => []), timeout]);
};

export interface UploadMediaOptions extends RetryOptions {
  config?: MediaPluginConfig;
  /** The next server is tried (its host), after the previous one failed */
  onServer?: (host: string) => void;
}

/**
 * Upload one file, trying each server in turn (`uploadTargets`) with retries, until one
 * stores it. Returns what is known about the uploaded file; throws the last server's
 * UploadFailure (`sign-in` when no one is signed in), or `cancelled`.
 */
export async function uploadMedia(
  file: File,
  options: UploadMediaOptions = {}
): Promise<MediaFileInfo> {
  const config = options.config ?? {};
  const prepared = config.keepMetadata ? file : await withoutMetadata(file);
  const [sha256, dim, servers] = await Promise.all([
    sha256Hex(prepared),
    mediaDim(prepared),
    userServers(config),
  ]);
  const targets = uploadTargets(config, servers);
  // One signature for every Blossom server and retry: it names the file's hash
  let auth: Promise<unknown | undefined> | undefined;
  const blossomAuth = () => {
    auth ??= signWithBrowser(
      blossomUploadAuth({
        sha256,
        expiration: Math.floor(Date.now() / 1000) + BLOSSOM_AUTH_SECONDS,
      })
    );
    return auth;
  };
  const once = async (target: UploadTarget): Promise<MediaFileInfo> => {
    if (target.type === 'nip96') {
      const stored = await uploadNip96(prepared, { ...options, uploadUrl: target.url });
      return { ...(dim ? { dim } : {}), size: prepared.size, ...stored };
    }
    const signed = await blossomAuth();
    if (options.signal?.aborted) throw uploadFailure('cancelled', 'Upload cancelled');
    if (!signed) throw uploadFailure('sign-in', 'Sign in to upload');
    const stored = await uploadBlossom(prepared, target.server, sha256, signed, options);
    return {
      url: stored.url,
      type: stored.type ?? prepared.type,
      sha256,
      size: stored.size ?? prepared.size,
      ...(dim ? { dim } : {}),
    };
  };
  let failure: unknown = uploadFailure('rejected', 'No server to upload to');
  let first = true;
  for (const target of targets) {
    if (!first) options.onServer?.(targetHost(target));
    first = false;
    try {
      const info = await withRetries(() => once(target), options);
      rememberMediaFile(info);
      return info;
    } catch (error) {
      failure = error;
      if (!tryNextServer(uploadFailureKind(error)) || options.signal?.aborted) break;
    }
  }
  throw failure;
}
