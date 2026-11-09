/**
 * Taking a photo or a video with the phone's camera, next to choosing files: a file input with
 * several files allowed opens only the file browser on Android, one with `capture` opens the
 * camera. Shown on touch screens, for the types the field accepts.
 */

import { html, nothing } from 'lit';
import type { MediaMessages } from './mediaMessages';

/** Whether the device has a touch screen as its main pointer (a phone or a tablet) */
const hasTouchScreen = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/** Whether `accept` (e.g. `image/*,video/*`) takes this kind of file */
export const accepts = (accept: string, kind: 'image' | 'video'): boolean =>
  accept
    .split(',')
    .map((type) => type.trim())
    .some((type) => type === `${kind}/*` || type.startsWith(`${kind}/`));

/** "Take photo" and "Record video" buttons; `onFiles` gets what the camera took */
export const renderCameraButtons = (
  accept: string,
  m: MediaMessages,
  onFiles: (files: File[]) => void
) => {
  if (!hasTouchScreen()) return nothing;
  const button = (kind: 'image' | 'video', label: string) =>
    accepts(accept, kind)
      ? html`<label class="camera np-button np-tonal np-small" part="button">
          ${label}
          <input
            class="camera-input"
            type="file"
            accept="${kind}/*"
            capture="environment"
            @change=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              onFiles(Array.from(input.files ?? []));
              input.value = '';
            }}
          />
        </label>`
      : nothing;
  return html`<div class="camera-buttons np-toolbar">
    ${button('image', m.takePhoto)} ${button('video', m.recordVideo)}
  </div>`;
};
