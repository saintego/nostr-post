/**
 * Note text for <nostr-post-view>: links, images, videos, #hashtags and `nostr:`
 * references in place, the way other Nostr clients show a kind 1 note.
 */

import { blossomFallbacks, blossomHash } from '@nostr-post/core/blossom';
import { decodeNaddr } from '@nostr-post/core/nip19';
import type { NoteToken } from '@nostr-post/core/noteContent';
import { kindViewFor, linkViewFor } from '@nostr-post/plugins/entities';
import { fetchBlossomServers, type NostrProfile } from '@nostr-post/signer';
import { html, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

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

export type NoteContentOptions = {
  /** Where `nostr:` references link to; the NIP-19 entity is appended */
  nostrLinkBase?: string;
  /** Profiles of mentioned pubkeys, shown as `@name` */
  profiles?: ReadonlyMap<string, NostrProfile>;
  /** The post's author: their Blossom servers are tried when an image fails to load */
  author?: string;
};

/** `@name` for a mentioned profile, else the short NIP-19 id */
const nostrLabel = (
  token: Extract<NoteToken, { type: 'nostr' }>,
  profiles: ReadonlyMap<string, NostrProfile> | undefined
): string => {
  const profile = token.pubkey ? profiles?.get(token.pubkey) : undefined;
  const name = profile?.display_name || profile?.name;
  return name ? `@${name}` : shortNostrId(token.id);
};

/**
 * An image that failed: the same file (by its Blossom hash) on the author's other servers
 * (their kind 10063 list), one after another
 */
const tryOtherServers = async (e: Event, author: string | undefined): Promise<void> => {
  const img = e.target as HTMLImageElement;
  const original = img.dataset.original ?? img.getAttribute('src') ?? '';
  if (!author || !blossomHash(original)) return;
  img.dataset.original = original;
  const tried = Number(img.dataset.tried ?? 0);
  const servers = await fetchBlossomServers(author).catch(() => []);
  const next = blossomFallbacks(original, servers)[tried];
  if (!next) return;
  img.dataset.tried = String(tried + 1);
  img.src = next;
};

const renderToken = (token: NoteToken, options: NoteContentOptions): TemplateResult => {
  switch (token.type) {
    case 'text':
      return html`${unsafeHTML(formatMarkdown(escapeHtml(token.text)))}`;
    case 'url':
      if (token.media === 'image') {
        return html`<a class="note-media" href=${token.url} target="_blank" rel="noopener noreferrer"
          ><img
            src=${token.url}
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
            @error=${(e: Event) => void tryOtherServers(e, options.author)}
        /></a>`;
      }
      if (token.media === 'video') {
        return html`<video class="note-media" src=${token.url} controls preload="metadata"></video>`;
      }
      return renderLink(token.url);
    case 'hashtag':
      return html`<span class="note-hashtag">#${token.tag}</span>`;
    case 'nostr': {
      // An event a domain package shows (calendar event, list, wiki page): its view, not a link
      const address = token.id.startsWith('naddr1') ? decodeNaddr(token.id) : undefined;
      const view = address ? kindViewFor(Number(address.split(':')[0])) : undefined;
      if (address && view) {
        const tag = unsafeStatic(view.tagName);
        return staticHtml`<${tag} class="note-embed" .address=${address}></${tag}>`;
      }
      return html`<a
        class="note-link"
        href=${`${options.nostrLinkBase ?? DEFAULT_NOSTR_LINK_BASE}${token.id}`}
        target="_blank"
        rel="noopener noreferrer"
        title=${token.id}
        >${nostrLabel(token, options.profiles)}</a
      >`;
    }
  }
};

/** A link: the view a plugin registered for it (e.g. a YouTube player), else the link */
const renderLink = (url: string): TemplateResult => {
  const view = linkViewFor(url);
  if (view) {
    const tag = unsafeStatic(view.tagName);
    return staticHtml`<${tag} class="note-embed" .url=${url}></${tag}>`;
  }
  return html`<a class="note-link" href=${url} target="_blank" rel="noopener noreferrer"
    >${linkLabel(url)}</a
  >`;
};

export const renderNoteContent = (
  tokens: readonly NoteToken[],
  options: NoteContentOptions = {}
): TemplateResult =>
  html`<div class="note-text">${tokens.map((t) => renderToken(t, options))}</div>`;
