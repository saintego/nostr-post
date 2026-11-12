/**
 * <np-media-gallery>: the photos and videos of posts, e.g. a page's section with the `gallery`
 * view (`sections` of a manifest, shown by `<nostr-post-sections>`), which gives it `.items`.
 * On its own, `.targets` (addresses or event ids) loads the targets and every post referencing
 * them (`fetchReferences`, `@nostr-post/posts`), or `.events` gives posts. A grid, newest first;
 * a photo or video opens large (`<np-lightbox>`: previous and next through all of them)
 * with its description, author, date and a link to its post.
 */

import type { PostSection } from '@nostr-post/core/types';
import { fetchReferences } from '@nostr-post/posts';
import { DEFAULT_RELAYS, fetchProfiles } from '@nostr-post/signer';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { type MediaItem, type MediaSource, mediaOfEvents } from '../eventMedia';
import { DEFAULT_MEDIA_GALLERY_MESSAGES, type MediaGalleryMessages } from './galleryMessages';
import { lightboxSlide, renderGrid } from './galleryParts';
import '@nostr-post/ui/web/lightbox';
import type { NpLightbox } from '@nostr-post/ui/web/lightbox';
import { galleryStyles } from './galleryStyles';

/** What a gallery shows on its own: heading, kinds, how many at first */
export interface MediaGalleryConfig {
  /** Heading; default "Photos and videos" */
  label?: string;
  /** Only posts of these kinds reference the targets; default any kind */
  kinds?: number[];
  /** Shown at first (default 12) */
  limit?: number;
}

@customElement('np-media-gallery')
export class NpMediaGallery extends NpElement {
  static override styles = [...npStyles, galleryStyles];

  /** A section's posts (the `gallery` view of `<nostr-post-sections>`): no loading, no heading */
  @property({ attribute: false }) items?: MediaSource[];
  /** The section it shows, as a section view (its `limit`) */
  @property({ attribute: false }) section?: PostSection;
  /** Addresses (`kind:pubkey:d-tag`) or event ids: these and the posts referencing them */
  @property({ type: Array }) targets: string[] = [];
  /** Posts shown besides (first); with them, the targets themselves aren't loaded */
  @property({ attribute: false }) events?: MediaSource[];
  @property({ attribute: false }) config: MediaGalleryConfig = {};
  /** Posts of these kinds don't count */
  @property({ type: Array, attribute: 'exclude-kinds' }) excludeKinds?: number[];
  @property({ type: Array }) relays: string[] = DEFAULT_RELAYS;
  @property({ attribute: false }) messages?: Partial<MediaGalleryMessages>;

  /** undefined while loading */
  @state() _items?: MediaItem[];
  @state() _shown = 12;
  @state() _names: ReadonlyMap<string, string> = new Map();
  @query('np-lightbox') _lightbox?: NpLightbox;
  _loads = 0;

  get _m(): MediaGalleryMessages {
    return { ...DEFAULT_MEDIA_GALLERY_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    const inputs = ['items', 'targets', 'events', 'config', 'excludeKinds', 'relays'];
    if (inputs.some((name) => changed.has(name))) void this._load();
  }

  async _posts(): Promise<MediaSource[]> {
    if (this.items) return this.items;
    const { targets, posts } = await fetchReferences(this.targets, {
      kinds: this.config.kinds,
      relays: this.relays,
      loadTargets: this.events === undefined,
    }).catch(() => ({ targets: [], posts: [] }));
    const excluded = new Set(this.excludeKinds ?? []);
    // The targets' own media first (e.g. a page's photo, an event's poster), then the posts'
    return [...(this.events ?? []), ...targets, ...posts.filter((e) => !excluded.has(e.kind))];
  }

  async _load(): Promise<void> {
    const load = ++this._loads;
    this._items = undefined;
    this._shown = this.section?.limit ?? this.config.limit ?? 12;
    const posts = await this._posts();
    if (load !== this._loads) return;
    // Items in their order (a section's own events first), each file once
    const seen = new Set<string>();
    this._items = posts.flatMap((post) =>
      mediaOfEvents([post]).filter((item) => {
        const key = item.sha256 ?? item.url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
    const profiles = await fetchProfiles(this._items.map((i) => i.event.pubkey)).catch(
      () => new Map()
    );
    if (load !== this._loads) return;
    this._names = new Map(
      [...profiles].flatMap(([pubkey, p]) => {
        const name = p?.display_name || p?.name;
        return name ? [[pubkey, name] as [string, string]] : [];
      })
    );
  }

  _openItem(item: MediaItem): void {
    void this._lightbox?.open(this._items?.indexOf(item) ?? 0);
  }

  override render() {
    const m = this._m;
    const items = this._items;
    return html`
      ${this.items ? nothing : html`<h3>${this.config.label ?? m.heading}</h3>`}
      ${items === undefined ? html`<div class="np-hint">${m.loading}</div>` : nothing}
      ${items?.length === 0 ? html`<div class="np-hint">${m.empty}</div>` : nothing}
      ${items?.length ? renderGrid(items.slice(0, this._shown), this._names, m, (i) => this._openItem(i)) : nothing}
      ${
        items && items.length > this._shown
          ? html`<button type="button" class="more np-button np-text np-small" part="button" @click=${() => {
              this._shown *= 2;
            }}>${m.showMore}</button>`
          : nothing
      }
      <np-lightbox
        exportparts="dialog, button"
        .slides=${(items ?? []).map((item) => lightboxSlide(item, this._names, m))}
        .messages=${{ close: m.close }}
      ></np-lightbox>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-gallery': NpMediaGallery;
  }
}
