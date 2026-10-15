/**
 * Note text for <nostr-post-view>: links, images, videos, #hashtags and `nostr:`
 * references in place, the way other Nostr clients show a kind 1 note.
 */

import type { NoteToken } from '@nostr-post/core/noteContent';
import { html, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/** Where `nostr:` references link to by default (a NIP-19 entity is appended) */
export const DEFAULT_NOSTR_LINK_BASE = 'https://njump.me/';

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Light markdown (bold, italic, code, headings) over already-escaped text */
const formatMarkdown = (escaped: string): string =>
  escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="note-code">$1</code>')
    .replace(/^### (.*?)$/gm, '<h4 class="note-heading">$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3 class="note-heading">$1</h3>')
    .replace(/^# (.*?)$/gm, '<h2 class="note-heading">$1</h2>')
    .replace(/\n/g, '<br>');

/** `https://www.example.com/a/` → `example.com/a` */
const linkLabel = (url: string): string =>
  url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

/** `npub1abcdef…` → `npub1abc…wxyz` */
const shortNostrId = (id: string): string =>
  id.length > 20 ? `${id.slice(0, 12)}…${id.slice(-6)}` : id;

const renderToken = (token: NoteToken, nostrLinkBase: string): TemplateResult => {
  switch (token.type) {
    case 'text':
      return html`${unsafeHTML(formatMarkdown(escapeHtml(token.text)))}`;
    case 'url':
      if (token.media === 'image') {
        return html`<a class="note-media" href=${token.url} target="_blank" rel="noopener noreferrer"
          ><img src=${token.url} alt="" loading="lazy" referrerpolicy="no-referrer"
        /></a>`;
      }
      if (token.media === 'video') {
        return html`<video class="note-media" src=${token.url} controls preload="metadata"></video>`;
      }
      return html`<a class="note-link" href=${token.url} target="_blank" rel="noopener noreferrer"
        >${linkLabel(token.url)}</a
      >`;
    case 'hashtag':
      return html`<span class="note-hashtag">#${token.tag}</span>`;
    case 'nostr':
      return html`<a
        class="note-link"
        href=${`${nostrLinkBase}${token.id}`}
        target="_blank"
        rel="noopener noreferrer"
        title=${token.id}
        >${shortNostrId(token.id)}</a
      >`;
  }
};

export const renderNoteContent = (
  tokens: readonly NoteToken[],
  nostrLinkBase: string = DEFAULT_NOSTR_LINK_BASE
): TemplateResult =>
  html`<div class="note-text">${tokens.map((t) => renderToken(t, nostrLinkBase))}</div>`;
