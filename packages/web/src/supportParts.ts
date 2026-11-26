/**
 * Template parts of <nostr-post-support>: a support page's fields, each shown by its plugin's
 * view element, and the people of an extra recipients list.
 */

import { encodeNpub } from '@nostr-post/core/nip19';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import type { PostField } from '@nostr-post/plugins/types';
import { html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import type { SupportMessages } from './supportMessages';

/** What a field's view gets besides its value: whose page it is and what is zapped */
export interface SupportContext {
  /** Hex pubkey of the page's owner */
  owner: string;
  /** The page's address, for zaps */
  address?: string;
  privateContext: boolean;
}

const hasValue = (value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0);

/** The fields in the order views show them (`viewOrder` first, then manifest order) */
export const orderedFields = (manifest: NostrPostManifest): PostField[] => {
  const order = manifest.viewOrder ?? [];
  const rank = (field: PostField) => {
    const index = order.indexOf(field.id);
    return index === -1 ? order.length : index;
  };
  return [...manifest.fields].sort((a, b) => rank(a) - rank(b)) as PostField[];
};

/** Whether a page's values show anything */
export const hasEntries = (manifest: NostrPostManifest, values: Record<string, unknown>): boolean =>
  manifest.fields.some((field) => hasValue(values[field.id]));

const fieldView = (field: PostField, value: unknown, context: SupportContext) => {
  const tagName = pluginRegistry.get(field.uiPlugin)?.viewTagName;
  if (!tagName) return html`<p>${String(value)}</p>`;
  const tag = unsafeStatic(tagName);
  return staticHtml`<${tag}
    .value=${value}
    .field=${field}
    .recipient=${context.owner}
    .address=${context.address}
    .privateContext=${context.privateContext}
  ></${tag}>`;
};

/**
 * The page's fields with values: the markdown intro as it is, the others under their label
 */
export const renderEntries = (
  manifest: NostrPostManifest,
  values: Record<string, unknown>,
  context: SupportContext
) =>
  orderedFields(manifest)
    .filter((field) => hasValue(values[field.id]))
    .map((field) => {
      const view = fieldView(field, values[field.id], context);
      if (field.uiPlugin === 'markdown') return html`<div class="support-section">${view}</div>`;
      const label = (field.metadata?.label as string | undefined) ?? field.id;
      return html`<section class="support-section"><h3>${label}</h3>${view}</section>`;
    });

/** The people of the extra recipients list, each payable by their profile's Lightning */
export const renderRecipients = (
  recipients: string[],
  m: SupportMessages,
  privateContext: boolean
) => {
  const npubs = recipients.map(encodeNpub).filter((npub): npub is string => npub !== undefined);
  if (npubs.length === 0 || !pluginRegistry.get('lightning')?.viewTagName) return nothing;
  return html`<section class="support-section">
    <h3>${m.alsoSupport}</h3>
    <np-lightning-view .value=${npubs} .privateContext=${privateContext}></np-lightning-view>
  </section>`;
};

/**
 * The heading and the owner's button: Edit when the page has entries, "Set up your support page"
 * when not. Nothing without a heading or a button.
 */
export const renderHead = (options: {
  heading?: string;
  edit?: 'edit' | 'create';
  m: SupportMessages;
  onEdit: () => void;
}) => {
  const { heading, edit, m, onEdit } = options;
  if (heading === undefined && !edit) return nothing;
  return html`<div class="support-head">
    ${heading === undefined ? html`<span class="np-spacer"></span>` : html`<h2 part="header">${heading}</h2>`}
    ${
      edit
        ? html`<button
            type="button"
            class="np-button ${edit === 'edit' ? 'np-small' : 'np-filled'}"
            part="button"
            @click=${onEdit}
          >
            ${edit === 'edit' ? m.edit : m.create}
          </button>`
        : nothing
    }
  </div>`;
};
