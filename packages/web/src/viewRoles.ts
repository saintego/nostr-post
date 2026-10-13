/**
 * References with a role in a plain-text post (e.g. a beer review's
 * `Tasted at: nostr:naddr1…` line): the view shows the text without those
 * lines, and each role as a row whose wiki page opens on demand.
 */

import { fieldLabel } from '@nostr-post/core/manifest';
import { readPostRoles } from '@nostr-post/core/postRoles';
import type { DisplayableEvent, NostrPostManifest } from '@nostr-post/core/types';
import type { PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { type TemplateResult, html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

/** The view element of a field's plugin, if it has one */
const viewTagOf = (field: PostField): string | undefined =>
  pluginRegistry.get(field.uiPlugin)?.viewTagName;

type EntityValue = { dTag: string };

/** Loads the page into the row only when it's opened (feeds show many posts) */
const openPage = (e: Event, dTag: string) => {
  const details = e.target as HTMLDetailsElement;
  if (!details.open || details.querySelector('nostr-wiki-view')) return;
  const view = document.createElement('nostr-wiki-view') as HTMLElement & { entityId?: string };
  view.entityId = dTag;
  details.appendChild(view);
};

/**
 * One referenced entity: a field with its own view (a venue) shows the place
 * (name, map, page); others a row whose wiki page opens on demand
 */
const roleRow = (field: PostField, entity: EntityValue) => {
  const viewTag = viewTagOf(field);
  if (viewTag) {
    const tag = unsafeStatic(viewTag);
    return staticHtml`<div class="post-role">
      <div class="post-role-label">${fieldLabel(field)}</div>
      <${tag} .value=${entity} .field=${field}></${tag}>
    </div>`;
  }
  return html`
    <details class="post-role" @toggle=${(e: Event) => openPage(e, entity.dTag)}>
      <summary>${fieldLabel(field)}: ${entity.dTag}</summary>
    </details>
  `;
};

/** The post's text without role lines, a row per referenced entity, and the remaining tags */
export function postRoleView(
  event: DisplayableEvent,
  manifest: NostrPostManifest | undefined
): { text: string; rows: TemplateResult | typeof nothing; tags: string[][] } {
  if (!manifest) return { text: event.content, rows: nothing, tags: event.tags };
  const { text, values, tags } = readPostRoles(event, manifest.fields);
  const rows = manifest.fields.flatMap((field) =>
    [values[field.id] ?? []].flat().map((entity) => roleRow(field, entity as EntityValue))
  );
  // Tags without the roles' `a` tags, for the other fields (e.g. the reviewed beer)
  return { text, rows: rows.length > 0 ? html`${rows}` : nothing, tags };
}
