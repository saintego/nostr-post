/**
 * References with a role in a plain-text post (e.g. a beer review's
 * `Tasted at: nostr:naddr1…` line): the view shows the text without those
 * lines, and each role as a row whose wiki page opens on demand.
 */

import { fieldLabel } from '@nostr-post/core/manifest';
import { readPostRoles } from '@nostr-post/core/postRoles';
import type { DisplayableEvent, NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html, nothing, type TemplateResult } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

/** The view element of a field's plugin, if it has one */
const viewTagOf = (field: PostField): string | undefined =>
  pluginRegistry.get(field.uiPlugin)?.viewTagName;

type EntityValue = { dTag?: string; displayName?: string; unlinked?: boolean };

/** Loads the page into the row only when it's opened (feeds show many posts) */
const openPage = (e: Event, dTag: string) => {
  const details = e.target as HTMLDetailsElement;
  if (!details.open || details.querySelector('nostr-wiki-view')) return;
  const view = document.createElement('nostr-wiki-view') as HTMLElement & { entityId?: string };
  view.entityId = dTag;
  details.appendChild(view);
};

/**
 * A role field's entities: a field with its own view shows them in it (a venue: name, map,
 * page; performers: their pages, and the names and links of those without one), the label
 * above; others a row per page, opening it on demand
 */
const roleRows = (field: PostField, value: unknown) => {
  const viewTag = viewTagOf(field);
  if (viewTag) {
    const tag = unsafeStatic(viewTag);
    return [
      staticHtml`<div class="post-role">
        <div class="post-role-label">${fieldLabel(field)}</div>
        <${tag} .value=${value} .field=${field} .hideLabel=${true}></${tag}>
      </div>`,
    ];
  }
  return ([value].flat() as EntityValue[]).flatMap((entity) => {
    if (entity.dTag) {
      const dTag = entity.dTag;
      return [
        html`<details class="post-role" @toggle=${(e: Event) => openPage(e, dTag)}>
          <summary>${fieldLabel(field)}: ${dTag}</summary>
        </details>`,
      ];
    }
    return entity.displayName
      ? [html`<div class="post-role">${fieldLabel(field)}: ${entity.displayName}</div>`]
      : [];
  });
};

/**
 * The post's text without role lines, a row per referenced entity, the remaining tags, and the
 * fields the rows show (`fields`: not shown again from the tags, where the other `a` tags, e.g.
 * the venue's page, would read as theirs)
 */
export function postRoleView(
  event: DisplayableEvent,
  manifest: NostrPostManifest | undefined
): { text: string; rows: TemplateResult | typeof nothing; tags: string[][]; fields: string[] } {
  if (!manifest) return { text: event.content, rows: nothing, tags: event.tags, fields: [] };
  const { text, values, tags } = readPostRoles(event, manifest.fields);
  const rows = manifest.fields.flatMap((field) =>
    field.id in values ? roleRows(field, values[field.id]) : []
  );
  // Tags without the roles' `a` tags, for the other fields (e.g. the reviewed beer)
  return {
    text,
    rows: rows.length > 0 ? html`${rows}` : nothing,
    tags,
    fields: Object.keys(values),
  };
}
