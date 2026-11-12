/**
 * @nostr-post/article - <nostr-article>
 *
 * One article by its address (`.address`, `30023:<pubkey>:<d-tag>`): web's <nostr-post-address>
 * with the article manifest, which loads the newest version and shows it (title, image,
 * summary, the formatted text, topics, publishing date). The kind view of 30023: a post linking
 * an article (`nostr:naddr…`) shows it like this. With `thread`, the article's own page: its
 * comments (NIP-22), reactions and update comments too.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import '@nostr-post/plugin-date/web';
import '@nostr-post/plugin-hashtag/web';
import '@nostr-post/plugin-markdown/web';
import '@nostr-post/plugin-media/web';
import { npExportParts } from '@nostr-post/ui';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import '@nostr-post/web';
import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ARTICLE_MANIFEST } from '../articleManifest';
import { isArticleAddress } from '../articles';

@customElement('nostr-article')
export class NostrArticle extends NpElement {
  static override styles = [
    ...npStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];

  @property() address = '';
  @property({ type: Array }) relays?: string[];
  /** Default ARTICLE_MANIFEST */
  @property({ attribute: false }) manifest: NostrPostManifest = ARTICLE_MANIFEST;
  /** With its comments, reactions and update comments */
  @property({ type: Boolean }) thread = false;
  /** An Edit button: its author republishes the article, anyone else suggests changes */
  @property({ type: Boolean }) editable = false;

  override render() {
    if (!isArticleAddress(this.address)) return nothing;
    return html`<nostr-post-address
      exportparts=${npExportParts}
      .address=${this.address}
      .relays=${this.relays}
      .manifest=${this.manifest}
      .thread=${this.thread}
      .editable=${this.editable}
    ></nostr-post-address>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-article': NostrArticle;
  }
}
