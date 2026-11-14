/**
 * @nostr-post/plugin-wiki-entity - <np-wiki-entity-view>: the picker's value in a post's view,
 * e.g. a gig's performers. A row per linked page, named by the page's title; opening a row loads
 * the page (`<nostr-wiki-view>`) in place, so a view with many posts loads no pages up front.
 * Entities without a page are listed by name with their links, or as their page when one of the
 * type created later has one of their links; the event's other links after them. A page the app
 * shows on its own (`setEntityPageHref`) is linked there too ("Open page").
 */

import { fieldLabel } from '@nostr-post/core/manifest';
import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import type { WikiEvent } from '@nostr-post/wiki';
import { DEFAULT_WIKI_RELAYS } from '@nostr-post/wiki';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  entityTypeAffixes,
  getEntityManifest,
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';
import { entityPageHref } from './entityPageHref';
import { entityPages, entityRows, titlesOf } from './pageTitles';
import { DEFAULT_WIKI_ENTITY_VIEW_MESSAGES, type WikiEntityViewMessages } from './pickerMessages';

/** A link's host and path, shorter than its URL */
const linkText = (url: string): string =>
  url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const linkList = (links: string[]) =>
  links.map(
    (url) => html`<a href=${url} target="_blank" rel="noopener noreferrer">${linkText(url)}</a>`
  );

@customElement('np-wiki-entity-view')
export class NpWikiEntityView extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host { display: block; margin: 0.5rem 0; font-size: var(--np-text-md); }
    .label { color: var(--np-color-on-surface-variant); margin-bottom: 0.25rem; }
    details, .named, .links { margin: 0.25rem 0; }
    summary { cursor: pointer; font-weight: 500; }
    .named { font-weight: 500; }
    .named a, .links a, .open { font-weight: 400; color: var(--np-color-primary); margin-left: 0.375rem; }

  `,
  ];

  @property({ attribute: false }) value: unknown;
  @property({ attribute: false }) field?: PostField;
  /** Leave out the field's label (a label above shows it) */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;
  /** Overrides of DEFAULT_WIKI_ENTITY_VIEW_MESSAGES (e.g. translations) */
  @property({ type: Object, attribute: false }) messages: Partial<WikiEntityViewMessages> = {};

  /** The shown pages, once loaded: their titles, and their links apart from the event's others */
  @state() private _pages: WikiEvent[] = [];

  private get _config(): WikiEntityPickerConfig {
    return (this.field?.metadata as WikiEntityPickerConfig | undefined) ?? {};
  }

  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('value')) return;
    const value = this.value;
    void entityPages(value, this._config.relays ?? DEFAULT_WIKI_RELAYS).then((pages) => {
      if (this.value === value) this._pages = pages;
    });
  }

  /** Loads the page into its row when the row is first opened */
  private _open(e: Event, entity: WikiEntityData): void {
    const details = e.target as HTMLDetailsElement;
    if (!details.open || details.querySelector('nostr-wiki-view')) return;
    const view = document.createElement('nostr-wiki-view') as HTMLElement & {
      entityId?: string;
      manifest?: unknown;
      relays?: string[];
    };
    view.entityId = entity.dTag;
    view.manifest = getEntityManifest(this._config.entityManifest);
    if (this._config.relays) view.relays = this._config.relays;
    details.appendChild(view);
  }

  /** The link to the entity's own page in the app, if it has one */
  private _pageLink(entity: WikiEntityData, manifest: ReturnType<typeof getEntityManifest>) {
    const href = entityPageHref(entity, manifest);
    if (!href) return nothing;
    const m = { ...DEFAULT_WIKI_ENTITY_VIEW_MESSAGES, ...this.messages };
    return html`<a class="open" part="link" href=${href} @click=${(e: Event) => e.stopPropagation()}
      >${m.openPage}</a
    >`;
  }

  override render() {
    const manifest = getEntityManifest(this._config.entityManifest);
    const affixes = manifest ? entityTypeAffixes(manifest) : undefined;
    const { linked, named, links } = entityRows(this.value, this._pages, affixes);
    if (!linked.length && !named.length && !links.length) return nothing;
    const titles = titlesOf(this._pages);
    return html`
      ${
        this.field && !this.hideLabel
          ? html`<div class="label">${fieldLabel(this.field)}</div>`
          : nothing
      }
      ${linked.map(
        (entity) => html`
          <details @toggle=${(e: Event) => this._open(e, entity)}>
            <summary>
              ${titles.get(entity.dTag) ?? entity.displayName ?? entity.dTag}
              ${this._pageLink(entity, manifest)}
            </summary>
          </details>
        `
      )}
      ${named.map((entity) => html`<div class="named">${entity.name}${linkList(entity.links)}</div>`)}
      ${links.length ? html`<div class="links">${linkList(links)}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-wiki-entity-view': NpWikiEntityView;
  }
}
