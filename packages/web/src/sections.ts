/**
 * @nostr-post/web - <nostr-post-sections>
 *
 * A page's sections (`sections` of its manifest, `PostSection`): for each, the posts referencing
 * the page or event that match it (`fetchSection`, `@nostr-post/posts`), shown by its view
 * (`list` here; `gallery`, `agenda`… registered by other packages, `registerSectionView`), with
 * stats and an optional "Add" composer linking the page. Wiki pages and calendar events' pages
 * show their manifest's sections with it.
 */

import type { NostrPostManifest, PostSection } from '@nostr-post/core/types';
import { entityManifests } from '@nostr-post/plugins/entities';
import {
  type AlsoLinkOption,
  alsoLinkTags,
  fetchSection,
  loadAlsoLinks,
  type SectionTarget,
  sectionStats,
} from '@nostr-post/posts';
import {
  DEFAULT_RELAYS,
  fetchManifestByATag,
  fetchProfiles,
  type SignedEvent,
} from '@nostr-post/signer';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '@nostr-post/ui/web/dialog';
import type { NpDialog } from '@nostr-post/ui/web/dialog';
import './composer';
import { ensurePluginsForManifest } from './pluginAutoLoad';
import { DEFAULT_SECTIONS_MESSAGES, type SectionsMessages } from './sectionsMessages';
import { addPrefill, renderAlso, renderList, renderStats, renderView } from './sectionsParts';
import { sectionsStyles } from './sectionsStyles';

/** A manifest by reference: the manifest, a `30078:` address, or an id the wiki package knows */
const resolveManifest = async (
  ref: string | NostrPostManifest,
  relays: string[]
): Promise<NostrPostManifest | undefined> => {
  if (typeof ref === 'object') return ref;
  if (ref.startsWith('30078:')) {
    return (await fetchManifestByATag(ref, relays).catch(() => undefined))?.manifest;
  }
  return entityManifests()?.resolve(ref);
};

@customElement('nostr-post-sections')
export class NostrPostSections extends NpElement {
  static override styles = [...npStyles, sectionsStyles];

  @property({ attribute: false }) sections: PostSection[] = [];
  /** What the sections reference: the page's or event's addresses (every version), ids, links */
  @property({ attribute: false }) target: SectionTarget = { addresses: [], ids: [], links: [] };
  /** The page's or event's own events, if loaded (for sections with `self`) */
  @property({ attribute: false }) self?: SignedEvent[];
  /** The value linking the page, for an "Add" composer's field (e.g. a wiki page's) */
  @property({ attribute: false }) linkValue?: unknown;
  /**
   * The page's or event's own manifest: "Add" offers the pages its fields link (`add.also`),
   * read from the event (`self`, else its newest version is loaded)
   */
  @property({ attribute: false }) manifest?: NostrPostManifest;
  /** A page's own rule for its items, e.g. the wiki's roles */
  @property({ attribute: false }) itemFilter?: (
    event: SignedEvent,
    section: PostSection
  ) => boolean;
  @property({ type: Array }) relays: string[] = DEFAULT_RELAYS;
  @property({ attribute: false }) messages?: Partial<SectionsMessages>;

  /** Items per section; undefined while loading */
  @state() _items: (SignedEvent[] | undefined)[] = [];
  @state() _shown: number[] = [];
  @state() _names: ReadonlyMap<string, string> = new Map();
  /** The section whose "Add" composer is open, and its manifest (null: not found) */
  @state() _adding?: { index: number; manifest: NostrPostManifest | null };
  /** The pages "Add" offers to link too, and those ticked */
  @state() _also: AlsoLinkOption[] = [];
  @state() _alsoTicked: ReadonlySet<string> = new Set();
  /** The section whose "Add" just queued a post (files uploading later) */
  @state() _queuedIn?: number;
  @query('np-dialog') _dialog?: NpDialog;
  _loadedFor = '';

  get _m(): SectionsMessages {
    return { ...DEFAULT_SECTIONS_MESSAGES, ...this.messages };
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (!['sections', 'target', 'self', 'relays'].some((name) => changed.has(name))) return;
    const key = JSON.stringify([
      this.sections,
      this.target,
      this.self?.map((e) => e.id),
      this.relays,
    ]);
    if (key === this._loadedFor) return;
    this._loadedFor = key;
    this._items = [];
    this._shown = this.sections.map((s) => s.limit ?? 20);
    this.sections.forEach((_, i) => void this._load(i));
  }

  async _load(index: number): Promise<void> {
    const section = this.sections[index];
    const key = this._loadedFor;
    if (!section) return;
    const items = await fetchSection(section, this.target, {
      relays: this.relays,
      self: this.self,
      matches: this.itemFilter,
    }).catch(() => []);
    if (key !== this._loadedFor) return;
    const next = [...this._items];
    next[index] = items;
    this._items = next;
    void this._loadNames(items);
  }

  async _loadNames(items: SignedEvent[]): Promise<void> {
    const missing = items.map((e) => e.pubkey).filter((p) => !this._names.has(p));
    if (missing.length === 0) return;
    const profiles = await fetchProfiles(missing).catch(() => new Map());
    const names = new Map(this._names);
    for (const [pubkey, profile] of profiles) {
      const name = profile?.display_name || profile?.name;
      if (name) names.set(pubkey, name);
    }
    this._names = names;
  }

  async _openAdd(index: number): Promise<void> {
    const ref = this.sections[index]?.add?.manifest;
    if (!ref) return;
    const manifest = (await resolveManifest(ref, this.relays)) ?? null;
    this._also = [];
    this._queuedIn = undefined;
    this._adding = { index, manifest };
    await this.updateComplete;
    this._dialog?.showModal();
    void this._loadAlso(index);
  }

  /** The pages the event links that the section's "Add" offers to link too */
  async _loadAlso(index: number): Promise<void> {
    const section = this.sections[index];
    const [address] = this.target.addresses;
    if (!section || !this.manifest || !address) return;
    // The page's fields are read by their plugins (e.g. a gig's venue page from its venue field)
    await ensurePluginsForManifest(this.manifest);
    const options = await loadAlsoLinks(section, this.manifest, address, {
      event: this.self?.[0],
      relays: this.relays,
    });
    if (this._adding?.index !== index) return;
    this._also = options;
    this._alsoTicked = new Set(options.filter((o) => o.checked).map((o) => o.address));
  }

  _tickAlso(address: string, on: boolean): void {
    const ticked = new Set(this._alsoTicked);
    if (on) ticked.add(address);
    else ticked.delete(address);
    this._alsoTicked = ticked;
  }

  _published(index: number): void {
    this._dialog?.close();
    this._adding = undefined;
    void this._load(index);
  }

  /** Queued in the outbox (its files upload later): closed, saying so; it shows once published */
  _queued(index: number): void {
    this._dialog?.close();
    this._adding = undefined;
    this._queuedIn = index;
  }

  _renderComposer() {
    const adding = this._adding;
    const section = adding ? this.sections[adding.index] : undefined;
    if (!adding || !section) return nothing;
    if (!adding.manifest) return html`<p class="status">${this._m.noComposer}</p>`;
    return html`${renderAlso(this._also, this._alsoTicked, this._m, (a, on) => this._tickAlso(a, on))}
      <nostr-post-composer
      auto-publish
      .manifest=${adding.manifest}
      .prefill=${addPrefill(section, adding.manifest, this.linkValue)}
      .extraTags=${alsoLinkTags([...this._alsoTicked]) || undefined}
      @nostr-post-published=${() => this._published(adding.index)}
      @nostr-post-queued=${() => this._queued(adding.index)}
    ></nostr-post-composer>`;
  }

  _renderSection(section: PostSection, index: number) {
    const m = this._m;
    const items = this._items[index];
    const shown = this._shown[index] ?? 20;
    const stats = items && section.stats ? sectionStats(items, section.stats.tag) : undefined;
    const list = () => html`
      ${renderList((items ?? []).slice(0, shown), this._names, m)}
      ${
        items && items.length > shown
          ? html`<button type="button" class="more np-button np-text np-small" part="button" @click=${() => {
              this._shown = this._shown.map((n, i) => (i === index ? n * 2 : n));
            }}>${m.showMore}</button>`
          : nothing
      }
    `;
    return html`<section>
      <div class="head" part="header">
        <h3 class="np-title" part="title">${section.label}</h3>
        ${
          section.add
            ? html`<button type="button" class="np-button np-tonal np-small" part="button" @click=${() => void this._openAdd(index)}>
                ${m.add(section.label)}
              </button>`
            : nothing
        }
      </div>
      ${items === undefined ? html`<div class="status">${m.loading}</div>` : nothing}
      ${items?.length === 0 ? html`<div class="status">${m.empty}</div>` : nothing}
      ${
        this._queuedIn === index
          ? html`<div class="np-message np-info" part="message" role="status">${m.queued}</div>`
          : nothing
      }
      ${renderStats(section, stats, m)}
      ${items?.length ? renderView(section, items, this.relays, list) : nothing}
    </section>`;
  }

  override render() {
    const m = this._m;
    const adding = this._adding ? this.sections[this._adding.index] : undefined;
    return html`
      ${this.sections.map((section, i) => this._renderSection(section, i))}
      <np-dialog
        exportparts="dialog, header, button"
        heading=${adding ? `${m.add(adding.label)}: ${adding.label}` : ''}
        .messages=${{ close: m.close }}
        @close=${() => {
          this._adding = undefined;
        }}
      >
        ${this._renderComposer()}
      </np-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-sections': NostrPostSections;
  }
}
