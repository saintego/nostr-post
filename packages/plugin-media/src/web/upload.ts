/**
 * Shared upload utilities for @nostr-post/plugin-media.
 *
 * Used by both <np-media-input> (XHR, for progress tracking) and the
 * composer's paste/drop handler (fetch via plugin hook).
 */

import type { PostField } from '@nostr-post/plugins/types';

export const NOSTR_BUILD_UPLOAD = 'https://nostr.build/api/v2/upload/files';

/**
 * Build a NIP-98 HTTP Auth token for the given request.
 * Returns null (and logs a warning) when window.nostr is unavailable or signing fails.
 */
export async function createNip98AuthToken(url: string, method: string): Promise<string | null> {
  const nostr = (
    window as unknown as {
      nostr?: {
        getPublicKey(): Promise<string>;
        signEvent(e: unknown): Promise<unknown>;
      };
    }
  ).nostr;
  if (!nostr) return null;

  try {
    const pubkey = await nostr.getPublicKey();
    const unsignedEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', url],
        ['method', method],
      ],
      content: '',
      pubkey,
    };
    const signedEvent = await nostr.signEvent(unsignedEvent);
    return btoa(JSON.stringify(signedEvent));
  } catch (err) {
    console.warn('NIP-98 auth failed:', err);
    return null;
  }
}

/**
 * Upload a single file to nostr.build (or a custom endpoint).
 * Uses fetch — no progress events.  Throws on failure.
 * Returns the hosted URL on success.
 */
export async function uploadToNostrBuild(
  file: File,
  uploadUrl = NOSTR_BUILD_UPLOAD
): Promise<string> {
  const body = new FormData();
  body.append('file', file);

  const token = await createNip98AuthToken(uploadUrl, 'POST');
  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: token ? { Authorization: `Nostr ${token}` } : {},
    body,
  });

  if (!resp.ok) throw new Error(`Upload failed (HTTP ${resp.status})`);

  const json = await resp.json();
  const url: string | undefined = json?.data?.[0]?.url ?? json?.url ?? json?.data?.url;
  if (!url) throw new Error('No URL in upload response');
  return url;
}

/**
 * Handle clipboard paste on a textarea — extract image files and upload them.
 * Injects uploaded URLs into the content field.
 * Called by the composer when the media plugin is registered.
 */
export async function handleMediaPaste(
  e: ClipboardEvent,
  field: PostField,
  ctx: {
    formData: Record<string, unknown>;
    onUpdateField: (fieldId: string, value: unknown) => void;
  }
): Promise<void> {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        try {
          const url = await uploadToNostrBuild(file);
          injectMediaUrlIntoContent(ctx, field.id, url);
        } catch (err) {
          console.error('Media paste upload failed:', err);
        }
      }
      break; // one image per paste
    }
  }
}

/**
 * Handle drag-drop on a textarea — extract image/video files and upload them.
 * Injects uploaded URLs into the content field.
 * Called by the composer when the media plugin is registered.
 */
export async function handleMediaDrop(
  e: DragEvent,
  field: PostField,
  ctx: {
    formData: Record<string, unknown>;
    onUpdateField: (fieldId: string, value: unknown) => void;
  }
): Promise<void> {
  const files = e.dataTransfer?.files;
  if (!files?.length) return;

  let handled = false;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      if (!handled) {
        e.preventDefault();
        handled = true;
      }
      try {
        const url = await uploadToNostrBuild(file);
        injectMediaUrlIntoContent(ctx, field.id, url);
      } catch (err) {
        console.error('Media drop upload failed:', err);
      }
    }
  }
}

/**
 * Append a media URL on a new line at the end of the content field.
 */
function injectMediaUrlIntoContent(
  ctx: {
    formData: Record<string, unknown>;
    onUpdateField: (fieldId: string, value: unknown) => void;
  },
  fieldId: string,
  url: string
): void {
  const current = String(ctx.formData[fieldId] ?? '');
  const newContent = current ? `${current}\n${url}` : url;
  ctx.onUpdateField(fieldId, newContent);
}
