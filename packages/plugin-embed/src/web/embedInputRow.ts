/**
 * @nostr-post/plugin-embed - The rows of <np-embed-input>: a link's preview with Edit and Remove,
 * or its text box (a new link, or one being edited)
 */

import { html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { embedFor, linkProvider } from '../core';
import type { EmbedMessages } from './embedMessages';

/** A saved link: its player or link (<np-embed>), Edit and Remove */
export const renderLinkPreview = (
  url: string,
  m: EmbedMessages,
  messages: Partial<EmbedMessages>,
  { onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }
): TemplateResult => html`
  <div class="link-row" part="item">
    <np-embed .url=${url} .messages=${messages}></np-embed>
    ${
      linkProvider(url) === 'bandcamp' && !embedFor(url)
        ? html`<p class="np-hint">${m.bandcampHint}</p>`
        : nothing
    }
    <div class="np-toolbar">
      <button type="button" class="np-button np-small" part="button" @click=${onEdit}>
        ${m.edit}
      </button>
      <button
        type="button"
        class="np-button np-small np-text np-danger"
        part="button"
        @click=${onRemove}
      >
        ${m.remove}
      </button>
    </div>
  </div>
`;

/** A link's text box: saved on change (leaving it, or Enter) */
export const renderLinkEditor = (
  row: string,
  m: EmbedMessages,
  {
    focus,
    onCommit,
    onRemove,
  }: { focus: boolean; onCommit: (text: string) => void; onRemove?: () => void }
): TemplateResult => html`
  <div class="row">
    <input
      class="np-input"
      part="input"
      type="text"
      inputmode="url"
      placeholder=${m.placeholder}
      ?autofocus=${focus}
      .value=${live(row)}
      @change=${(e: Event) => onCommit((e.target as HTMLInputElement).value)}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
      }}
    />
    ${
      onRemove
        ? html`<button
            type="button"
            class="np-button np-small np-text np-danger"
            part="button"
            @click=${onRemove}
          >
            ${m.remove}
          </button>`
        : nothing
    }
  </div>
`;
