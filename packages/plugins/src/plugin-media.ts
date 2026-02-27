/**
 * @nostr-post/plugins - Media upload plugin
 *
 * A plugin for handling image and video uploads
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from './types';

export interface MediaPluginConfig {
  accept?: string[]; // File types: ['image/*', 'video/*']
  maxSize?: number; // Max file size in bytes
  multiple?: boolean;
}

export const mediaPlugin: NostrUIPlugin = {
  id: 'media',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'string') {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Media URL must be a string',
          code: 'INVALID_TYPE',
        },
      };
    }

    // Basic URL validation
    try {
      new URL(value);
    } catch {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Invalid media URL',
          code: 'INVALID_URL',
        },
      };
    }

    return { success: true, data: undefined };
  },

  renderInput: (ctx): HTMLElement => {
    const config = (ctx.field.metadata as MediaPluginConfig) || {};
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 1rem;';

    // File input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = config.accept?.join(',') ?? 'image/*,video/*';
    fileInput.style.cssText = `
      padding: 0.5rem;
      border: 2px dashed #d1d5db;
      border-radius: 4px;
      cursor: pointer;
    `;
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          ctx.onChange(dataUrl);
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
    container.appendChild(fileInput);

    // Preview
    const preview = document.createElement('div');
    preview.style.cssText = 'display: none;';
    if (ctx.value) {
      preview.style.display = 'block';
      if (String(ctx.value).startsWith('data:image')) {
        const img = document.createElement('img');
        img.src = String(ctx.value);
        img.style.cssText = 'max-width: 100%; max-height: 200px; border-radius: 4px;';
        preview.appendChild(img);
      } else if (String(ctx.value).startsWith('data:video')) {
        const video = document.createElement('video');
        video.src = String(ctx.value);
        video.style.cssText = 'max-width: 100%; max-height: 200px; border-radius: 4px;';
        video.controls = true;
        preview.appendChild(video);
      } else {
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = String(ctx.value);
        urlInput.placeholder = 'Or paste media URL here';
        urlInput.style.cssText = `
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        `;
        urlInput.addEventListener('input', (e) => {
          ctx.onChange((e.target as HTMLInputElement).value);
        });
        preview.appendChild(urlInput);
      }
    } else {
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = 'Or paste media URL here';
      urlInput.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
      `;
      urlInput.addEventListener('input', (e) => {
        ctx.onChange((e.target as HTMLInputElement).value);
      });
      preview.appendChild(urlInput);
    }
    container.appendChild(preview);

    return container;
  },

  renderView: (value: unknown): HTMLElement => {
    const container = document.createElement('div');
    const url = String(value ?? '');

    if (
      url.startsWith('data:image') ||
      url.includes('.png') ||
      url.includes('.jpg') ||
      url.includes('.jpeg') ||
      url.includes('.gif') ||
      url.includes('.webp')
    ) {
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'max-width: 100%; max-height: 400px; border-radius: 4px;';
      img.alt = 'Uploaded image';
      container.appendChild(img);
    } else if (url.startsWith('data:video') || url.includes('.mp4') || url.includes('.webm')) {
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

    return container;
  },
};
