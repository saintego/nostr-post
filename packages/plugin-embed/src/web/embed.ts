/**
 * @nostr-post/plugin-embed - <np-embed>
 *
 * One link: its provider's player behind a "Play" button (the player, and with it the
 * provider, loads only when asked), or the link itself when it has no player.
 * Accepts .url; `autoplay-load` loads the player right away.
 */

import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { embedFor } from '../core';
import { DEFAULT_EMBED_MESSAGES, type EmbedMessages } from './embedMessages';
import { embedStyles } from './embedStyles';

@customElement('np-embed')
export class NpEmbed extends LitElement {
  static override styles = embedStyles;

  @property() url = '';
  /** Load the player without waiting for a click */
  @property({ type: Boolean, attribute: 'autoplay-load' }) autoplayLoad = false;
  @property({ type: Object }) messages: Partial<EmbedMessages> = {};

  @state() _loaded = false;

  get _m(): EmbedMessages {
    return { ...DEFAULT_EMBED_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('url') && changed.get('url') !== undefined) this._loaded = false;
  }

  override render() {
    const embed = embedFor(this.url);
    if (!embed) {
      return this.url
        ? html`<a class="link" href=${this.url} target="_blank" rel="noopener noreferrer"
            >${this.url}</a
          >`
        : nothing;
    }
    const m = this._m;
    const name = m.providers[embed.provider];
    const size = embed.height ? `height: ${embed.height}px` : '';
    if (!this._loaded && !this.autoplayLoad) {
      return html`<button
        type="button"
        class=${`placeholder ${embed.height ? '' : 'video'}`}
        style=${embed.height ? `min-height: ${Math.min(embed.height, 152)}px` : ''}
        @click=${() => {
          this._loaded = true;
        }}
      >
        <span>${m.play(name)}</span>
        <span class="note">${m.loadsFrom(name)}</span>
      </button>`;
    }
    return html`<iframe
      class=${`frame ${embed.height ? '' : 'video'}`}
      style=${size}
      src=${embed.src}
      title=${name}
      loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen
    ></iframe>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-embed': NpEmbed;
  }
}
