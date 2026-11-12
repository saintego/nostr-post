/** Template parts of <np-media-gallery>: the grid, and a photo or video as a lightbox slide */

import { encodeNaddr, encodeNevent, encodeNpub } from '@nostr-post/core/nip19';
import type { LightboxSlide } from '@nostr-post/ui/web/lightbox';
import { html, type TemplateResult } from 'lit';
import type { MediaItem } from '../eventMedia';
import type { MediaGalleryMessages } from './galleryMessages';

/** Where an item's post opens (a NIP-19 link: naddr for addressable posts, else nevent) */
export const postLink = (item: MediaItem, base = 'https://njump.me/'): string => {
  const { id, pubkey, kind, tags } = item.event;
  const dTag = tags.find((t) => t[0] === 'd')?.[1];
  const naddr =
    kind >= 30000 && kind < 40000 && dTag !== undefined
      ? encodeNaddr(`${kind}:${pubkey}:${dTag}`)
      : undefined;
  return `${base}${naddr ?? encodeNevent(id, { author: pubkey, kind }) ?? id}`;
};

/** A pubkey as its profile name, else a short npub */
export const authorName = (pubkey: string, names: ReadonlyMap<string, string>): string => {
  const name = names.get(pubkey);
  if (name) return name;
  const npub = encodeNpub(pubkey) ?? pubkey;
  return `${npub.slice(0, 12)}…`;
};

const date = (item: MediaItem) => new Date(item.event.created_at * 1000).toLocaleDateString();

const tile = (item: MediaItem, alt: string, m: MediaGalleryMessages) => {
  if (item.media === 'image') {
    return html`<img src=${item.url} alt=${alt} loading="lazy" referrerpolicy="no-referrer" />`;
  }
  // A video: its thumbnail if the post has one, else its first frame
  const preview = item.image
    ? html`<img src=${item.image} alt=${alt} loading="lazy" referrerpolicy="no-referrer" />`
    : html`<video src=${item.url} preload="metadata" muted></video>`;
  return html`${preview}<span class="badge" aria-label=${m.video}>▶</span>`;
};

export const renderGrid = (
  items: MediaItem[],
  names: ReadonlyMap<string, string>,
  m: MediaGalleryMessages,
  onOpen: (item: MediaItem) => void
): TemplateResult => html`<div class="grid">
  ${items.map((item) => {
    const alt = item.alt ?? m.photoAlt(authorName(item.event.pubkey, names));
    return html`<button type="button" class="thumb" title=${alt} @click=${() => onOpen(item)}>
      ${tile(item, alt, m)}
    </button>`;
  })}
</div>`;

/** A photo or video as a lightbox slide: its description, who posted it when, a link to the post */
export const lightboxSlide = (
  item: MediaItem,
  names: ReadonlyMap<string, string>,
  m: MediaGalleryMessages
): LightboxSlide => {
  const author = authorName(item.event.pubkey, names);
  return {
    url: item.url,
    media: item.media,
    alt: item.alt ?? (item.media === 'image' ? m.photoAlt(author) : undefined),
    poster: item.image,
    caption: html`<span class="byline">${m.byline(author, date(item))}</span>
      <a href=${postLink(item)} target="_blank" rel="noopener noreferrer">${m.openPost}</a>`,
  };
};
