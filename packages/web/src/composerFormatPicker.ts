import type { PublishFormat } from '@nostr-post/core/types';
import { html } from 'lit';

export const renderPublishFormatPicker = (
  formats: PublishFormat[],
  selectedId: string,
  hide: boolean,
  onChange: (id: string) => void
) => {
  if (hide || formats.length <= 1) return '';

  const selectedFormat = formats.find((f) => f.id === selectedId);

  return html`
    <div class="publish-format-panel">
      <label class="publish-format-label" for="publish-format-select">Publish as</label>
      <select
        id="publish-format-select"
        class="publish-format-select"
        .value=${selectedId}
        @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}
      >
        ${formats.map(
          (format: PublishFormat) => html`<option value=${format.id}>${format.label}</option>`
        )}
      </select>
      ${
        selectedFormat?.description
          ? html`<p class="publish-format-description">${selectedFormat.description}</p>`
          : ''
      }
    </div>
  `;
};
