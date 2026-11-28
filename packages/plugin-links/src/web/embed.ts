/**
 * @nostr-post/plugin-links - <np-embed>
 *
 * One link as a player, by the rules (`.rules`; default: the app's and the built-in ones): its
 * provider's player behind a "Play" button (the player, and with it the provider, loads only
 * when asked), or the link itself when it has no player. Accepts .url; `autoplay-load` loads the
 * player right away. The link shows under the player (`show-url="false"` / `.showUrl = false`
 * hides it; default: `showsUrl`, the app's setting).
 */

import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type LinkRule, type LinkView, viewLink } from '../rules';
import { linkRules, linkText, showsUrl } from '../settings';
import { DEFAULT_LINKS_MESSAGES, type LinksMessages } from './linksMessages';
import { linksStyles } from './linksStyles';

@customElement('np-embed')
export class NpEmbed extends NpElement {
  static override styles = [...npStyles, linksStyles];

  @property() url = '';
  /** Load the player without waiting for a click */
  @property({ type: Boolean, attribute: 'autoplay-load' }) autoplayLoad = false;
  @property({ type: Object }) messages: Partial<LinksMessages> = {};
  /** The rules that decide the player (default: the app's and the built-in ones) */
  @property({ attribute: false }) rules?: LinkRule[];
  /** Show the link under its player; unset: the app's setting (`configureLinks`), else yes */
  @property({
    attribute: 'show-url',
    converter: (value) => (value === null ? undefined : value !== 'false'),
  })
  showUrl?: boolean;

  @state() _loaded = false;

  get _m(): LinksMessages {
    return { ...DEFAULT_LINKS_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('url') && changed.get('url') !== undefined) this._loaded = false;
  }

  override render() {
    const embed = viewLink(this.url, this.rules ?? linkRules());
    if (embed.format !== 'embed') {
      return this.url
        ? html`<a class="link" href=${this.url} target="_blank" rel="noopener noreferrer"
            >${this.url}</a
          >`
        : nothing;
    }
    return html`${this._player(embed)}${
      showsUrl(undefined, this.showUrl)
        ? html`<a class="link source" href=${this.url} target="_blank" rel="noopener noreferrer"
            >${linkText(this.url)} ↗</a
          >`
        : nothing
    }`;
  }

  _player(embed: LinkView) {
    const m = this._m;
    const provider = embed.rule?.provider ?? '';
    const name = m.providers[provider] ?? embed.rule?.name ?? provider;
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
