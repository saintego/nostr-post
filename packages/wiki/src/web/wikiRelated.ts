/**
 * <nostr-wiki-related>: the related items of a wiki entity, one section per
 * `wikiConfig.related` entry (e.g. a brewery's beers, a beer's reviews).
 * Wiki entities open their page on demand; posts show a short text.
 */

import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DEFAULT_WIKI_RELAYS, WIKI_KIND } from '../nip54';
import {
  fetchRelated,
  RELATED_STATS_LIMIT,
  relatedImages,
  relatedSnippet,
  relatedStats,
  type WikiRelatedSection,
} from '../related';
import type { WikiEvent } from '../resolver';
import { DEFAULT_WIKI_RELATED_MESSAGES, type WikiRelatedMessages } from './relatedMessages';

const titleOf = (e: WikiEvent): string =>
  e.tags.find((t) => t[0] === 'title')?.[1] ?? e.tags.find((t) => t[0] === 'd')?.[1] ?? '';

/** Loads an entity's page into its row only when opened */
const openPage = (e: Event, dTag: string) => {
  const details = e.target as HTMLDetailsElement;
  if (!details.open || details.querySelector('nostr-wiki-view')) return;
  const view = document.createElement('nostr-wiki-view') as HTMLElement & { entityId?: string };
  view.entityId = dTag;
  details.appendChild(view);
};

@customElement('nostr-wiki-related')
export class NostrWikiRelated extends LitElement {
  static override styles = css`
    :host { display: block; }
    section { margin-top: 1rem; }
    h3 { font-size: 0.95rem; margin: 0 0 0.375rem; }
    .item { padding: 0.375rem 0; border-top: 1px solid var(--nl-border, #e5e7eb); font-size: 0.875rem; }
    .byline { color: var(--nl-muted, #6b7280); font-size: 0.75rem; }
    summary { cursor: pointer; }
    .status { color: var(--nl-muted, #6b7280); font-size: 0.8125rem; }
    button { margin-top: 0.375rem; font-size: 0.8125rem; cursor: pointer; }
    .stats { font-size: 0.875rem; margin-bottom: 0.375rem; }
    .gallery { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-bottom: 0.5rem; }
    .gallery img { width: 5rem; height: 5rem; object-fit: cover; border-radius: 0.375rem; }
  `;

  /** The entity's d-tag */
  @property({ type: String, attribute: 'entity-id' }) entityId?: string;
  @property({ attribute: false }) sections: WikiRelatedSection[] = [];
  @property({ type: Array }) relays: string[] = DEFAULT_WIKI_RELAYS;
  @property({ attribute: false }) messages?: Partial<WikiRelatedMessages>;

  /** Items per section index; undefined while loading */
  @state() private _items: (WikiEvent[] | undefined)[] = [];
  @state() private _limits: number[] = [];
  private _loadedFor = '';

  private get _m(): WikiRelatedMessages {
    return { ...DEFAULT_WIKI_RELATED_MESSAGES, ...this.messages };
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has('entityId') && !changed.has('sections')) return;
    const key = `${this.entityId}\u0000${JSON.stringify(this.sections)}`;
    if (!this.entityId || key === this._loadedFor) return;
    this._loadedFor = key;
    this._limits = this.sections.map((s) => s.limit ?? 20);
    this._items = [];
    this.sections.forEach((_, i) => void this._load(i));
  }

  private async _load(index: number): Promise<void> {
    const section = this.sections[index];
    const dTag = this.entityId;
    if (!section || !dTag) return;
    // Stats and a gallery cover more posts than the list shows
    const listed = this._limits[index] ?? 20;
    const wanted =
      section.stats || section.gallery ? Math.max(listed, RELATED_STATS_LIMIT) : listed;
    const items = await fetchRelated(dTag, section, this.relays, wanted).catch(() => []);
    if (dTag !== this.entityId) return;
    const next = [...this._items];
    next[index] = items;
    this._items = next;
  }

  private _showMore(index: number): void {
    this._limits = this._limits.map((l, i) => (i === index ? l * 2 : l));
    // Already read when the section has stats (up to RELATED_STATS_LIMIT)
    if ((this._items[index]?.length ?? 0) < (this._limits[index] ?? 0)) void this._load(index);
  }

  /** "12 in total · ★ 4.3 / 5" and the images of the section's posts */
  private _renderSummary(section: WikiRelatedSection, items: WikiEvent[]) {
    const stats = section.stats && relatedStats(items, section.stats.tag);
    const images = section.gallery ? relatedImages(items) : [];
    return html`
      ${stats ? html`<div class="stats">${this._m.stats(stats.count, stats.average, section.stats?.max)}</div>` : nothing}
      ${
        images.length > 0
          ? html`<div class="gallery">
              ${images.map((url) => html`<a href=${url} target="_blank" rel="noopener"><img src=${url} alt="" loading="lazy" referrerpolicy="no-referrer" /></a>`)}
            </div>`
          : nothing
      }
    `;
  }

  private _renderItem(e: WikiEvent) {
    const m = this._m;
    if (e.kind === WIKI_KIND) {
      const dTag = e.tags.find((t) => t[0] === 'd')?.[1] ?? '';
      return html`<details class="item" @toggle=${(ev: Event) => openPage(ev, dTag)}>
        <summary>${titleOf(e)}</summary>
      </details>`;
    }
    const date = new Date(e.created_at * 1000).toLocaleDateString();
    return html`<div class="item">
      <div>${relatedSnippet(e)}</div>
      <div class="byline">${m.byline(`${e.pubkey.slice(0, 8)}…`, date)}</div>
    </div>`;
  }

  override render() {
    const m = this._m;
    return this.sections.map((section, i) => {
      const items = this._items[i];
      const limit = this._limits[i] ?? 20;
      return html`<section>
        <h3>${section.label}</h3>
        ${items === undefined ? html`<div class="status">${m.loading}</div>` : nothing}
        ${items?.length === 0 ? html`<div class="status">${m.empty}</div>` : nothing}
        ${items?.length ? this._renderSummary(section, items) : nothing}
        ${items?.slice(0, limit).map((e) => this._renderItem(e))}
        ${items && items.length >= limit ? html`<button type="button" @click=${() => this._showMore(i)}>${m.showMore}</button>` : nothing}
      </section>`;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-wiki-related': NostrWikiRelated;
  }
}
