/**
 * References with a role in a plain-text post (e.g. a beer review's
 * `Tasted at: nostr:naddr1…` line): the view shows the text without those
 * lines, and each role as a row whose wiki page opens on demand.
 */

import { fieldLabel } from '@nostr-post/core/manifest';
import { readPostRoles } from '@nostr-post/core/postRoles';
import type { DisplayableEvent, NostrPostManifest } from '@nostr-post/core/types';
import { type TemplateResult, html, nothing } from 'lit';

type EntityValue = { dTag: string };

/** Loads the page into the row only when it's opened (feeds show many posts) */
const openPage = (e: Event, dTag: string) => {
  const details = e.target as HTMLDetailsElement;
  if (!details.open || details.querySelector('nostr-wiki-view')) return;
  const view = document.createElement('nostr-wiki-view') as HTMLElement & { entityId?: string };
  view.entityId = dTag;
  details.appendChild(view);
};

/** The post's text without role lines, and a row per referenced entity */
export function postRoleView(
  event: DisplayableEvent,
  manifest: NostrPostManifest | undefined
): { text: string; rows: TemplateResult | typeof nothing } {
  if (!manifest) return { text: event.content, rows: nothing };
  const { text, values } = readPostRoles(event, manifest.fields);
  const rows = manifest.fields.flatMap((field) =>
    [values[field.id] ?? []].flat().map(
      (entity) => html`
        <details class="post-role" @toggle=${(e: Event) => openPage(e, (entity as EntityValue).dTag)}>
          <summary>${fieldLabel(field)}: ${(entity as EntityValue).dTag}</summary>
        </details>
      `
    )
  );
  return { text, rows: rows.length > 0 ? html`${rows}` : nothing };
}
