/**
 * <np-media-input> on phones: one compact row instead of the drop zone (there's nothing to
 * drop on a phone): choose files, take a photo, record a video, and one hint line. A file input
 * with several files allowed opens only the file browser on Android, one with `capture` opens
 * the camera. The camera buttons are for the types the field accepts.
 */

import { html, nothing } from 'lit';
import type { MediaMessages } from './mediaMessages';

/** Whether the device has a touch screen as its main pointer (a phone or a tablet) */
export const hasTouchScreen = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/** Whether `accept` (e.g. `image/*,video/*`) takes this kind of file */
export const accepts = (accept: string, kind: 'image' | 'video'): boolean =>
  accept
    .split(',')
    .map((type) => type.trim())
    .some((type) => type === `${kind}/*` || type.startsWith(`${kind}/`));

/**
 * The phone's row: "Choose files" (`onChoose` opens the field's file input), "Take photo",
 * "Record video" (`onFiles` gets what the camera took), and `hint` (where files go, how many)
 */
export const renderPhonePicker = (
  accept: string,
  m: MediaMessages,
  hint: string,
  onChoose: () => void,
  onFiles: (files: File[]) => void
) => {
  const camera = (kind: 'image' | 'video', label: string) =>
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
  return html`<div class="phone-picker np-toolbar">
      <button type="button" class="np-button np-tonal np-small" part="button" @click=${onChoose}>
        ${m.chooseFiles}
      </button>
      ${camera('image', m.takePhoto)} ${camera('video', m.recordVideo)}
    </div>
    <div class="np-hint" part="hint">${hint}</div>`;
};
