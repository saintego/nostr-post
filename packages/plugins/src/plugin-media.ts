/**
 * @nostr-post/plugins - Media upload plugin
 *
 * Supports a single URL or an array of media URLs (images/videos).
 * When mapped to tags, each URL becomes a separate tag (e.g. ["r", url]).
 * For kind 1 content, URLs are appended as newlines which clients render inline.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from './types';

export interface MediaPluginConfig {
  accept?: string[]; // File types: ['image/*', 'video/*']
  maxSize?: number; // Max file size in bytes
  /** Maximum number of files. Default: 10 */
  maxFiles?: number;
}

/** Check if a string is a plausible URL */
const isUrl = (s: string): boolean => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

/** Detect whether a URL points to a video */
const isVideoUrl = (url: string): boolean =>
  url.startsWith('data:video') || /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);

/** Detect whether a URL points to an image */
const isImageUrl = (url: string): boolean =>
  url.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url);

// ── Helpers ─────────────────────────────────────────────────────────

/** Normalize value to a string array */
const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
};

// ── Plugin definition ───────────────────────────────────────────────

export const mediaPlugin: NostrUIPlugin = {
  id: 'media',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const urls = toArray(value);

    if (urls.length === 0 && field.required) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'At least one media file is required',
          code: 'MISSING_MEDIA',
        },
      };
    }

    const config = (field.metadata as MediaPluginConfig) || {};
    const max = config.maxFiles ?? 10;

    if (urls.length > max) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Maximum ${max} media files allowed`,
          code: 'TOO_MANY_FILES',
        },
      };
    }

    for (const url of urls) {
      // Allow data URIs and http(s) URLs
      if (!url.startsWith('data:') && !isUrl(url)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Invalid media URL: ${url}`,
            code: 'INVALID_URL',
          },
        };
      }
    }

    return { success: true, data: undefined };
  },

  /** Serialize array → newline-separated string (for content) or JSON (for tag fallback) */
  serializeValue: (value: unknown): string => {
    const urls = toArray(value);
    return urls.length === 1 ? urls[0] : JSON.stringify(urls);
  },

  /** Deserialize back to array */
  deserializeValue: (raw: string): unknown => {
    if (!raw) return [];
    // Try JSON array first
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* fall through */
      }
    }
    // Single URL
    return [raw];
  },

  formatValue: (value: unknown): string => {
    const urls = toArray(value);
    return urls.map((u) => (u.startsWith('data:') ? '[uploaded file]' : u)).join(', ');
  },

  renderInput: (ctx): HTMLElement => {
    const config = (ctx.field.metadata as MediaPluginConfig) || {};
    const maxFiles = config.maxFiles ?? 10;

    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';

    let urls: string[] = toArray(ctx.value);

    // ── Gallery of current files ──

    const gallery = document.createElement('div');
    gallery.style.cssText = 'display: flex; flex-wrap: wrap; gap: 0.5rem;';

    const renderGallery = () => {
      gallery.innerHTML = '';

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const card = document.createElement('div');
        card.style.cssText = `
          position: relative; border: 1px solid #e5e7eb; border-radius: 6px;
          overflow: hidden; width: 120px; height: 90px; background: #f3f4f6;
        `;

        if (isImageUrl(url)) {
          const img = document.createElement('img');
          img.src = url;
          img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
          img.alt = `Media ${i + 1}`;
          card.appendChild(img);
        } else if (isVideoUrl(url)) {
          const video = document.createElement('video');
          video.src = url;
          video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
          video.muted = true;
          card.appendChild(video);
          const badge = document.createElement('span');
          badge.textContent = '▶';
          badge.style.cssText = `
            position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.6);
            color: #fff; padding: 0 4px; border-radius: 3px; font-size: 0.7rem;
          `;
          card.appendChild(badge);
        } else {
          const placeholder = document.createElement('div');
          placeholder.style.cssText = `
            width: 100%; height: 100%; display: flex; align-items: center;
            justify-content: center; font-size: 0.7rem; color: #6b7280;
            padding: 0.25rem; word-break: break-all; text-align: center;
          `;
          placeholder.textContent = url.length > 30 ? `${url.slice(0, 27)}…` : url;
          card.appendChild(placeholder);
        }

        // Remove button
        const idx = i;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.style.cssText = `
          position: absolute; top: 2px; right: 2px;
          background: rgba(0,0,0,0.6); color: #fff; border: none;
          border-radius: 50%; width: 20px; height: 20px;
          cursor: pointer; font-size: 0.8rem; line-height: 1;
          display: flex; align-items: center; justify-content: center;
        `;
        removeBtn.addEventListener('click', () => {
          urls = urls.filter((_, j) => j !== idx);
          ctx.onChange(urls.length === 0 ? undefined : [...urls]);
          renderGallery();
        });
        card.appendChild(removeBtn);

        gallery.appendChild(card);
      }
    };

    container.appendChild(gallery);

    // ── Add controls ──

    if (urls.length < maxFiles) {
      const addRow = document.createElement('div');
      addRow.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

      // File picker
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = config.accept?.join(',') ?? 'image/*,video/*';
      fileInput.multiple = true;
      fileInput.style.cssText = `
        padding: 0.5rem; border: 2px dashed #d1d5db; border-radius: 4px;
        cursor: pointer; flex: 1; font-size: 0.85rem;
      `;
      fileInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files) return;
        const remaining = maxFiles - urls.length;
        const toRead = Array.from(files).slice(0, remaining);

        let loaded = 0;
        for (const file of toRead) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            urls = [...urls, dataUrl];
            loaded++;
            if (loaded === toRead.length) {
              ctx.onChange([...urls]);
              renderGallery();
            }
          };
          reader.readAsDataURL(file);
        }
      });
      addRow.appendChild(fileInput);
      container.appendChild(addRow);

      // URL input
      const urlRow = document.createElement('div');
      urlRow.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = 'Or paste a URL and press Enter';
      urlInput.style.cssText =
        'flex: 1; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.85rem;';
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = urlInput.value.trim();
          if (val && (val.startsWith('data:') || isUrl(val))) {
            urls = [...urls, val];
            ctx.onChange([...urls]);
            urlInput.value = '';
            renderGallery();
          }
        }
      });
      urlRow.appendChild(urlInput);
      container.appendChild(urlRow);
    }

    // ── Count hint ──

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size: 0.75rem; color: #9ca3af;';
    hint.textContent = `${urls.length}/${maxFiles} files`;
    container.appendChild(hint);

    renderGallery();

    return container;
  },

  renderView: (value: unknown): HTMLElement => {
    const container = document.createElement('div');
    const urls = toArray(value);

    if (urls.length === 0) {
      return container;
    }

    container.style.cssText = 'display: flex; flex-wrap: wrap; gap: 0.5rem;';

    for (const url of urls) {
      if (isImageUrl(url)) {
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'max-width: 100%; max-height: 400px; border-radius: 4px;';
        img.alt = 'Uploaded image';
        container.appendChild(img);
      } else if (isVideoUrl(url)) {
        const video = document.createElement('video');
        video.src = url;
        video.style.cssText = 'max-width: 100%; max-height: 400px; border-radius: 4px;';
        video.controls = true;
        container.appendChild(video);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = 'View Media';
        link.target = '_blank';
        link.style.cssText = 'color: #6366f1; text-decoration: underline;';
        container.appendChild(link);
      }
    }

    return container;
  },
};
