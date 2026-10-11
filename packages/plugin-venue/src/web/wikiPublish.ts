/**
 * <np-venue-wiki-publish>: next to the publish button (publishSummaryTagName),
 * for a venue field with `metadata.wikiEntity`: whether the venue's wiki page
 * will be created, updated or just linked, with the checkbox to opt out. For a
 * new page it shows the slug (it can't be changed later) as an editable input
 * with its availability, plus suggested details when another venue has it.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { PostField } from '@nostr-post/plugins/types';
import {
  type DTagAvailability,
  type EntityManifestRef,
  entityTypeAffixes,
  getEntityManifest,
  normalizeDTag,
  resolveEntityManifest,
} from '@nostr-post/wiki';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { VenueData } from '../core';
import {
  OSM_COPYRIGHT_URL,
  slugBody,
  venueDTag,
  venueIdentifiers,
  venueQualifierSuggestions,
  venueToEntityData,
} from '../wikiEntity';
import { DEFAULT_VENUE_WIKI_MESSAGES, type VenueWikiMessages } from './venueMessages';
import { wikiPublishStyles } from './wikiPublishStyles';

type Plan =
  | { kind: 'checking' | 'error' }
  | { kind: 'create'; data: Record<string, unknown> }
  | { kind: 'update' | 'none'; title: string };

@customElement('np-venue-wiki-publish')
export class NpVenueWikiPublish extends LitElement {
  static styles = wikiPublishStyles;

  @property({ attribute: false }) value: VenueData | null = null;
  @property({ attribute: false }) field: PostField | null = null;
  /** Overrides for the user-facing text */
  @property({ attribute: false }) messages?: Partial<VenueWikiMessages>;

  @state() private _plan: Plan = { kind: 'checking' };
  @state() private _slug: DTagAvailability | 'checking' = 'checking';
  private _plannedKey = '';
  private _checkedDTag = '';
  private _planId = 0;
  private _slugId = 0;
  private _slugTimer?: ReturnType<typeof setTimeout>;

  private get _m(): VenueWikiMessages {
    return { ...DEFAULT_VENUE_WIKI_MESSAGES, ...this.messages };
  }

  private get _manifest(): NostrPostManifest | undefined {
    return getEntityManifest(this.field?.metadata?.wikiEntity as EntityManifestRef | undefined);
  }

  private _resolvedRef?: unknown;

  /** Fetch a manifest given by its published address once; re-render when it arrives */
  private _resolveManifest(): void {
    const ref = this.field?.metadata?.wikiEntity as EntityManifestRef | undefined;
    if (!ref || ref === this._resolvedRef || this._manifest) return;
    this._resolvedRef = ref;
    void resolveEntityManifest(ref).then((manifest) => {
      if (manifest) this.requestUpdate();
    });
  }

  private get _enabled(): boolean {
    return !!this._manifest && !!this.value && venueIdentifiers(this.value).length > 0;
  }

  /** The new page's slug: as edited by the user, else generated from the template */
  private get _dTag(): string | undefined {
    const manifest = this._manifest;
    if (this._plan.kind !== 'create' || !manifest || !this.value) return undefined;
    return venueDTag(manifest, this._plan.data, this.value.wikiSlug);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._slugTimer);
  }

  override updated(): void {
    this._resolveManifest();
    const key = this._enabled && this.value ? venueIdentifiers(this.value).join(',') : '';
    if (key && key !== this._plannedKey) {
      this._plannedKey = key;
      void this._loadPlan();
    }
    const dTag = this._dTag;
    if (dTag && dTag !== this._checkedDTag) {
      this._checkedDTag = dTag;
      this._checkSlug(dTag);
    }
  }

  private async _loadPlan(): Promise<void> {
    const planId = ++this._planId;
    const venue = this.value;
    const manifest = this._manifest;
    if (!venue || !manifest) return;
    this._plan = { kind: 'checking' };
    try {
      const { planVenueEntity } = await import('../wikiSync');
      const { action, osm } = await planVenueEntity(venue);
      if (planId !== this._planId) return;
      this._plan =
        action.kind === 'create'
          ? { kind: 'create', data: venueToEntityData(venue, osm, manifest) }
          : { kind: action.kind, title: action.base.tags.find((t) => t[0] === 'title')?.[1] ?? '' };
    } catch {
      if (planId === this._planId) this._plan = { kind: 'error' };
    }
  }

  /** Debounced: the user may be typing a detail */
  private _checkSlug(dTag: string): void {
    clearTimeout(this._slugTimer);
    const slugId = ++this._slugId;
    this._slug = 'checking';
    this._slugTimer = setTimeout(async () => {
      const { slugAvailability } = await import('../wikiSync');
      const { DEFAULT_WIKI_RELAYS } = await import('@nostr-post/wiki');
      const status = await slugAvailability(dTag, DEFAULT_WIKI_RELAYS).catch(
        () => 'unknown' as const
      );
      if (slugId === this._slugId) this._slug = status;
    }, 400);
  }

  private _emit(change: Partial<VenueData>): void {
    if (!this.value) return;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: { ...this.value, ...change } },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _planText(): string {
    const m = this._m;
    const plan = this._plan;
    if (plan.kind === 'create') return m.willCreate;
    if (plan.kind === 'update') return m.willUpdate(plan.title);
    if (plan.kind === 'none') return m.upToDate(plan.title);
    return plan.kind === 'error' ? m.checkFailed : m.checking;
  }

  /** The new page's slug, always editable (it can't be changed later) */
  private _renderSlug() {
    const dTag = this._dTag;
    const manifest = this._manifest;
    if (!dTag || !manifest || !this.value) return nothing;
    const m = this._m;
    const affixes = entityTypeAffixes(manifest);
    const status = {
      checking: m.slugChecking,
      free: m.slugFree,
      taken: m.slugTaken,
      unknown: m.slugUnknown,
    }[this._slug];
    return html`
      <label class="slug ${this._slug}">
        ${m.slugLabel}
        <span class="slug-input">
          ${affixes.prefix ? html`<code>${affixes.prefix}</code>` : nothing}
          <input
            type="text"
            .value=${this.value.wikiSlug ?? slugBody(dTag, affixes)}
            @input=${(e: InputEvent) => this._emit({ wikiSlug: (e.target as HTMLInputElement).value })}
          />
          ${affixes.suffix ? html`<code>${affixes.suffix}</code>` : nothing}
        </span>
        <span class="slug-status">${status}</span>
      </label>
      ${this._slug === 'taken' ? this._renderSuggestions(slugBody(dTag, affixes)) : nothing}
    `;
  }

  /** Only when another venue uses the slug: details to append to it */
  private _renderSuggestions(body: string) {
    if (!this.value) return nothing;
    return html`
      <div class="qualifier">
        ${venueQualifierSuggestions(this.value).map(
          (text) =>
            html`<button type="button" @click=${() => this._emit({ wikiSlug: `${body}-${normalizeDTag(text)}` })}>
              + ${text}
            </button>`
        )}
      </div>
    `;
  }

  override render() {
    if (!this._enabled || !this.value) return nothing;
    const m = this._m;
    const checked = this.value.syncWiki !== false;
    return html`
      <div class="wiki-publish">
        <label class="sync">
          <input
            type="checkbox"
            .checked=${checked}
            @change=${(e: Event) => this._emit({ syncWiki: (e.target as HTMLInputElement).checked })}
          />
          ${m.syncLabel}
        </label>
        ${checked ? html`<p class="plan">${this._planText()}</p>${this._renderSlug()}` : nothing}
        <div class="attribution">
          <a href=${OSM_COPYRIGHT_URL} target="_blank" rel="noopener">${m.osmAttribution}</a>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-wiki-publish': NpVenueWikiPublish;
  }
}
