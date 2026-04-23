import type { NostrPostManifest } from '@nostr-post/core/types';
import { html } from 'lit';

export const renderComposerHeader = (metadata: NostrPostManifest['metadata']) => {
  if (!metadata?.name && !metadata?.description) return '';
  return html`
    <div class="composer-header">
      ${metadata.name ? html`<h2 class="composer-title">${metadata.name}</h2>` : ''}
      ${
        metadata.description
          ? html`<p class="composer-description">${metadata.description}</p>`
          : ''
      }
    </div>
  `;
};
