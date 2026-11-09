/**
 * Template parts of <nostr-post-sections>: a section's view (a registered one, else the list),
 * the built-in list (wiki pages opening on demand, posts as short texts opening in full), and
 * the "Add" composer's prefill.
 */

import { encodeNpub } from '@nostr-post/core/nip19';
import type { NostrPostManifest, PostSection } from '@nostr-post/core/types';
import { kindViewFor, sectionViewFor } from '@nostr-post/plugins/entities';
import { type AlsoLinkOption, addressOf, postSnippet } from '@nostr-post/posts';
import type { SignedEvent } from '@nostr-post/signer';
import { html, nothing, type TemplateResult } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import type { SectionsMessages } from './sectionsMessages';

/** A pubkey as its profile name, else a short npub */
const authorName = (pubkey: string, names: ReadonlyMap<string, string>): string =>
  names.get(pubkey) ?? `${(encodeNpub(pubkey) ?? pubkey).slice(0, 12)}…`;

const titleOf = (e: SignedEvent): string =>
  e.tags.find((t) => t[0] === 'title')?.[1] ?? e.tags.find((t) => t[0] === 'd')?.[1] ?? '';

/** Loads an item's full view into its row only when it's opened */
const openItem = (e: Event, item: SignedEvent) => {
  const details = e.target as HTMLDetailsElement;
  if (!details.open || details.querySelector('.item-view')) return;
  const address = addressOf(item);
  const kindView = address ? kindViewFor(item.kind) : undefined;
  const view = document.createElement(kindView?.tagName ?? 'nostr-post-view') as HTMLElement & {
    address?: string;
    event?: SignedEvent;
  };
  view.className = 'item-view';
  if (kindView && address) view.address = address;
  else view.event = item;
  details.appendChild(view);
};

/** The built-in list: each item a row that opens its full view */
export const renderList = (
  items: readonly SignedEvent[],
  names: ReadonlyMap<string, string>,
  m: SectionsMessages
): TemplateResult =>
  html`${items.map((item) => {
    const date = new Date(item.created_at * 1000).toLocaleDateString();
    const summary =
      item.kind === 30818
        ? titleOf(item)
        : html`<div>${postSnippet(item) || titleOf(item)}</div>
          <div class="byline">${m.byline(authorName(item.pubkey, names), date)}</div>`;
    return html`<details class="item" @toggle=${(e: Event) => openItem(e, item)}>
    <summary>${summary}</summary>
  </details>`;
  })}`;

/** A section's view: the registered one (with `items`, `section`, `relays`), else the list */
export const renderView = (
  section: PostSection,
  items: SignedEvent[],
  relays: string[],
  list: () => TemplateResult
): TemplateResult => {
  const registered =
    section.view && section.view !== 'list' ? sectionViewFor(section.view) : undefined;
  if (!registered) return list();
  const tag = unsafeStatic(registered.tagName);
  return staticHtml`<${tag} .items=${items} .section=${section} .relays=${relays}></${tag}>`;
};

/** What "Add" fills in: the field linking the page (a list for a field taking several) */
export const addPrefill = (
  section: PostSection,
  manifest: NostrPostManifest,
  linkValue: unknown
): Record<string, unknown> => {
  const fieldId = section.add?.field;
  if (!fieldId || linkValue === undefined) return {};
  const field = manifest.fields.find((f) => f.id === fieldId);
  return { [fieldId]: field?.metadata?.multiple ? [linkValue] : linkValue };
};

/** "Also show on": the pages "Add" can link too (`add.also`), as checkboxes */
export const renderAlso = (
  options: AlsoLinkOption[],
  ticked: ReadonlySet<string>,
  m: SectionsMessages,
  onTick: (address: string, on: boolean) => void
): TemplateResult | typeof nothing =>
  options.length === 0
    ? nothing
    : html`<fieldset class="also" part="also">
        <legend class="np-label">${m.alsoShowOn}</legend>
        ${options.map(
          (o) => html`<label class="also-page">
            <input
              type="checkbox"
              class="np-checkbox"
              .checked=${ticked.has(o.address)}
              @change=${(e: Event) => onTick(o.address, (e.target as HTMLInputElement).checked)}
            />
            ${o.label}
          </label>`
        )}
      </fieldset>`;

/** The stats line, when the section has `stats` */
export const renderStats = (
  section: PostSection,
  stats: { count: number; average?: number } | undefined,
  m: SectionsMessages
): TemplateResult | typeof nothing =>
  section.stats && stats
    ? html`<div class="stats">${m.stats(stats.count, stats.average, section.stats.max)}</div>`
    : nothing;
