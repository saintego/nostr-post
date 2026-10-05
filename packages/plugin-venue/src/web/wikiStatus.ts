/**
 * <np-venue-wiki-status>: in the venue card of a field with
 * `metadata.wikiEntity`, whether the venue's wiki page will be created,
 * updated or just linked, with the checkbox to opt out and OSM attribution.
 * Dispatches `venue-wiki-sync-change` with `{ syncWiki }`.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { VenueData } from '../core';
import { OSM_COPYRIGHT_URL, venueIdentifiers } from '../wikiEntity';
import { DEFAULT_VENUE_WIKI_MESSAGES, type VenueWikiMessages } from './venueMessages';

type Status =
  | { kind: 'checking' }
  | { kind: 'create' }
  | { kind: 'update' | 'none'; title: string }
  | { kind: 'error' };

@customElement('np-venue-wiki-status')
export class NpVenueWikiStatus extends LitElement {
  static styles = css`
    :host { display: block; margin-top: 0.5rem; font-size: 0.8rem; }
    label { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
    .status { margin: 0.25rem 0 0; color: var(--nl-text-secondary, #6b7280); }
    .attribution { font-size: 0.7rem; color: var(--nl-text-secondary, #9ca3af); }
    .attribution a { color: inherit; }
  `;

  @property({ attribute: false }) venue: VenueData | null = null;
  @property({ attribute: false }) field: PostField | null = null;
  /** Overrides for the user-facing text */
  @property({ attribute: false }) messages?: Partial<VenueWikiMessages>;

  @state() private _status: Status = { kind: 'checking' };
  private _checkedKey = '';
  private _checkId = 0;

  private get _m(): VenueWikiMessages {
    return { ...DEFAULT_VENUE_WIKI_MESSAGES, ...this.messages };
  }

  private get _enabled(): boolean {
    return (
      !!this.field?.metadata?.wikiEntity && !!this.venue && venueIdentifiers(this.venue).length > 0
    );
  }

  override updated(): void {
    const key = this._enabled && this.venue ? venueIdentifiers(this.venue).join(',') : '';
    if (key && key !== this._checkedKey) {
      this._checkedKey = key;
      void this._check();
    }
  }

  private async _check(): Promise<void> {
    const checkId = ++this._checkId;
    const venue = this.venue;
    if (!venue) return;
    this._status = { kind: 'checking' };
    try {
      const { planVenueEntity } = await import('../wikiSync');
      const { action } = await planVenueEntity(venue);
      if (checkId !== this._checkId) return;
      this._status =
        action.kind === 'create'
          ? { kind: 'create' }
          : {
              kind: action.kind,
              title: action.base.tags.find((t) => t[0] === 'title')?.[1] ?? '',
            };
    } catch {
      if (checkId === this._checkId) this._status = { kind: 'error' };
    }
  }

  private _statusText(): string {
    const m = this._m;
    const status = this._status;
    if (status.kind === 'create') return m.willCreate;
    if (status.kind === 'update') return m.willUpdate(status.title);
    if (status.kind === 'none') return m.upToDate(status.title);
    return status.kind === 'error' ? m.checkFailed : m.checking;
  }

  override render() {
    if (!this._enabled || !this.venue) return nothing;
    const m = this._m;
    const checked = this.venue.syncWiki !== false;
    return html`
      <label>
        <input
          type="checkbox"
          .checked=${checked}
          @change=${(e: Event) =>
            this.dispatchEvent(
              new CustomEvent('venue-wiki-sync-change', {
                detail: { syncWiki: (e.target as HTMLInputElement).checked },
                bubbles: true,
                composed: true,
              })
            )}
        />
        ${m.syncLabel}
      </label>
      ${checked ? html`<p class="status">${this._statusText()}</p>` : nothing}
      <div class="attribution">
        <a href=${OSM_COPYRIGHT_URL} target="_blank" rel="noopener">${m.osmAttribution}</a>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-wiki-status': NpVenueWikiStatus;
  }
}
