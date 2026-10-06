import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { fetchEvents } from '@nostr-post/signer';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type ExternalIdLink, externalIdLink } from '../externalIds';
import { fetchEntityVersions } from '../fetch';
import {
  DEFAULT_WIKI_RELAYS,
  STANDARD_WIKI_MANIFEST,
  WIKI_KIND,
  unmappedTableRows,
  wikiEventToManifestData,
} from '../nip54';
import type { WikiEvent, WikiResolverFunction } from '../resolver';
import { countContributors, defaultResolver, selectNewestEntity } from '../resolver';
import { DEFAULT_WIKI_VIEW_MESSAGES, type WikiViewMessages } from './wiki-view-messages';
import { viewStyles } from './wiki-view-styles';

/** Resolving the newest version needs every relay's versions, not the first answer */
const ALL_RELAYS = { waitForAll: true, relayTimeoutMs: 5000 };

@customElement('nostr-wiki-view')
export class NostrWikiView extends LitElement {
  static styles = viewStyles;
  @property({ type: String, attribute: 'entity-id' })
  entityId?: string;

  @property({ type: String, attribute: 'entity-i-id' })
  entityIId?: string;

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ attribute: false })
  resolver: WikiResolverFunction = defaultResolver;

  @property({ type: Array })
  relays: string[] = DEFAULT_WIKI_RELAYS;

  /** Show this version instead of fetching and resolving the entity */
  @property({ attribute: false })
  event?: WikiEvent;

  /** Overrides for the view's user-facing text (e.g. translations) */
  @property({ attribute: false })
  messages?: Partial<WikiViewMessages>;

  @state() private _loading = false;
  @state() private _error?: string;
  @state() private _formData?: Record<string, unknown>;
  @state() private _winningEvent?: WikiEvent;
  @state() private _allEvents: WikiEvent[] = [];
  private _fetchId = 0;

  // First fetch happens in the initial updated() call, which reports every
  // property set before the first render — no separate connectedCallback fetch.
  override updated(changed: Map<string, unknown>): void {
    if (this.event && (changed.has('event') || changed.has('manifest'))) {
      this._showEvent(this.event);
    } else if (
      changed.has('entityId') ||
      changed.has('entityIId') ||
      changed.has('manifest') ||
      changed.has('event')
    ) {
      void this._fetch();
    }
  }

  private _showEvent(event: WikiEvent): void {
    this._fetchId++;
    this._loading = false;
    this._error = undefined;
    this._allEvents = [event];
    this._winningEvent = event;
    this._formData = wikiEventToManifestData(event, this._manifest);
  }

  private async _fetch(): Promise<void> {
    const fetchId = ++this._fetchId;
    if (!this.entityId && !this.entityIId) {
      this._loading = false;
      this._error = undefined;
      this._formData = undefined;
      this._winningEvent = undefined;
      this._allEvents = [];
      return;
    }

    this._loading = true;
    this._error = undefined;

    try {
      const events = await this._loadEvents(fetchId);
      if (events === null) return;
      const winner = this.resolver(events);
      this._allEvents = events;
      this._winningEvent = winner ?? undefined;
      this._formData = winner ? wikiEventToManifestData(winner, this._manifest) : undefined;
    } catch (err) {
      if (fetchId !== this._fetchId) return;
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      if (fetchId === this._fetchId) this._loading = false;
    }
  }

  /**
   * Fetches every version of the entity, by d-tag or by `i` tag. Returns null
   * when a newer fetch has superseded this one.
   */
  private async _loadEvents(fetchId: number): Promise<WikiEvent[] | null> {
    if (this.entityId) {
      const versions = await fetchEntityVersions(this.entityId, this.relays);
      return fetchId === this._fetchId ? versions : null;
    }
    const events = (await fetchEvents(
      { kinds: [WIKI_KIND], '#i': [this.entityIId], limit: 50 } as never,
      this.relays,
      ALL_RELAYS
    )) as unknown as WikiEvent[];
    if (fetchId !== this._fetchId) return null;
    if (events.length === 0) return events;
    return this._loadEntityVersions(events, fetchId);
  }

  /**
   * Several entities can share an `i` tag, but the resolver assumes a single
   * d-tag. Pick one entity (the d-tag whose resolved winner is newest) and load
   * every version of it. Returns null when a newer fetch has superseded this one.
   */
  private async _loadEntityVersions(
    events: WikiEvent[],
    fetchId: number
  ): Promise<WikiEvent[] | null> {
    const chosen = selectNewestEntity(events, this.resolver);
    if (!chosen) return [];
    const versions = await fetchEntityVersions(chosen, this.relays);
    if (fetchId !== this._fetchId) return null;
    const byId = new Map<string, WikiEvent>();
    for (const e of [...events, ...versions]) {
      if (e.tags.find((t) => t[0] === 'd')?.[1] === chosen) byId.set(e.id, e);
    }
    return [...byId.values()];
  }

  /** The given manifest, or the standard one (article text) for wiki pages of unknown type */
  private get _manifest(): NostrPostManifest {
    return this.manifest ?? STANDARD_WIKI_MANIFEST;
  }

  private get _m(): WikiViewMessages {
    return { ...DEFAULT_WIKI_VIEW_MESSAGES, ...this.messages };
  }

  /** Links to the entity's external pages, from its `i` tags of known kinds */
  private _renderLinks(event: WikiEvent) {
    const links = event.tags
      .filter((t) => t[0] === 'i' && t[1])
      .map((t) => externalIdLink(t[1]))
      .filter((link): link is ExternalIdLink => !!link);
    if (links.length === 0) return nothing;
    return html`<div class="wiki-links">
      <span class="wiki-links-label">${this._m.links}</span>
      ${links.map(
        (link) =>
          html`<a href=${link.url} target="_blank" rel="noopener">${this._m.externalLink(link.provider)}</a>`
      )}
    </div>`;
  }

  /**
   * Everything the event contains, collapsed: infobox rows the manifest
   * doesn't read, all tags and the raw source, so nothing is hidden by the
   * clean, manifest-based rendering above.
   */
  private _renderAllData(event: WikiEvent) {
    const m = this._m;
    const unmapped = unmappedTableRows(event, this._manifest);
    return html`<details class="wiki-all-data">
      <summary>${m.allData}</summary>
      ${
        unmapped.length > 0
          ? html`<h4>${m.otherFields}</h4>
            <dl>${unmapped.map(([key, value]) => html`<dt>${key}</dt><dd>${value}</dd>`)}</dl>`
          : nothing
      }
      <h4>${m.tags}</h4>
      <ul>${event.tags.map((t) => html`<li><code>${t[0]}</code> ${t.slice(1).join(', ')}</li>`)}</ul>
      <h4>${m.source}</h4>
      <pre>${event.content}</pre>
    </details>`;
  }

  /** "© OpenStreetMap contributors"-style lines for the event's `source` tags */
  private _renderSources(event: WikiEvent) {
    const sources = event.tags.filter((t) => t[0] === 'source' && t[1]);
    if (sources.length === 0) return nothing;
    return html`<div class="wiki-sources">
      ${sources.map((t) =>
        t[2]?.startsWith('https://')
          ? html`<a href=${t[2]} target="_blank" rel="noopener">${this._m.sourceAttribution(t[1])}</a>`
          : html`<span>${this._m.sourceAttribution(t[1])}</span>`
      )}
    </div>`;
  }

  override render() {
    const m = this._m;
    if (this._loading) return html`<slot name="loading"><p>${m.loading}</p></slot>`;
    if (this._error) return html`<slot name="error"><p>${m.error(this._error)}</p></slot>`;
    if (!this._winningEvent || !this._formData) {
      return html`<slot name="empty"><p>${m.notFound}</p></slot>`;
    }

    const { _manifest: manifest, _formData: data, _allEvents } = this;

    const infoFields = manifest.fields
      .filter((f) => f.visibility?.view !== 'hidden' && !f.attachTo)
      .filter((f) => {
        const targets = Array.isArray(f.mapTo) ? f.mapTo : [f.mapTo];
        return targets.some((t) => {
          if (t.kind !== WIKI_KIND) return false;
          if (t.target === 'table') return true;
          if (t.target === 'tag') return t.tagName !== 'd' && t.tagName !== 'title';
          return false;
        });
      })
      .filter((f) => data[f.id] !== undefined);

    const titleField = manifest.fields.find((f) => {
      const targets = Array.isArray(f.mapTo) ? f.mapTo : [f.mapTo];
      return targets.some(
        (t) => t.kind === WIKI_KIND && t.target === 'tag' && t.tagName === 'title'
      );
    });
    const eventTitleTag = this._winningEvent.tags.find((tag) => tag[0] === 'title')?.[1];
    const titleValue = titleField
      ? String(data[titleField.id] ?? eventTitleTag ?? data.__dTag ?? '')
      : String(eventTitleTag ?? data.__dTag ?? '');

    return html`
      <div class="wiki-view">
        <header class="wiki-header">
          <h2>${titleValue}</h2>
          <span class="wiki-badge">${
            this.event
              ? `${this.event.pubkey.slice(0, 8)}… · ${new Date(this.event.created_at * 1000).toLocaleString()}`
              : m.contributors(countContributors(_allEvents))
          }</span>
        </header>

        ${
          infoFields.length > 0
            ? html`
          <dl class="wiki-infobox">
            ${infoFields.map((f) => {
              const value = data[f.id];
              const label = (f.metadata?.label as string | undefined) ?? f.id;
              const plugin = pluginRegistry.get(f.uiPlugin);
              const rendered = plugin?.renderView
                ? plugin.renderView(value, f)
                : Array.isArray(value)
                  ? value.join(', ')
                  : String(value);
              return html`
                <div class="wiki-field">
                  <dt>${label}</dt>
                  <dd>${rendered}</dd>
                </div>
              `;
            })}
          </dl>
        `
            : nothing
        }

        ${this._renderProseField()}

        ${this._renderLinks(this._winningEvent)}
        ${this._renderSources(this._winningEvent)}
        ${this._renderAllData(this._winningEvent)}
        ${this.event ? nothing : this._renderVersionList()}
      </div>
    `;
  }

  private _renderVersionList() {
    const { _allEvents } = this;
    return html`
        <details class="wiki-contributors">
          <summary>${this._m.allVersions(_allEvents.length)}</summary>
          ${_allEvents.map(
            (e) => html`
            <div class="wiki-contributor">
              <span>${e.pubkey.slice(0, 8)}…</span>
              <span>${new Date(e.created_at * 1000).toLocaleDateString()}</span>
            </div>
          `
          )}
        </details>
    `;
  }

  private _renderProseField() {
    if (!this._formData) return nothing;
    const contentField = this._manifest.fields.find((f) => {
      const targets = Array.isArray(f.mapTo) ? f.mapTo : [f.mapTo];
      return targets.some((t) => t.kind === WIKI_KIND && t.target === 'content');
    });
    if (!contentField) return nothing;
    const value = this._formData[contentField.id];
    if (!value) return nothing;
    const plugin = pluginRegistry.get(contentField.uiPlugin);
    if (plugin?.renderView) {
      return html`<div class="wiki-prose">${plugin.renderView(value, contentField)}</div>`;
    }
    return html`<div class="wiki-prose">${String(value)}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-wiki-view': NostrWikiView;
  }
}
