/**
 * Template parts of the people components: a person's avatar and name.
 */

import type { NostrProfile } from '@nostr-post/signer';
import { html, nothing, type TemplateResult } from 'lit';
import { profileName } from '../search';

export const renderAvatar = (profile: NostrProfile | undefined): TemplateResult =>
  profile?.picture
    ? html`<img class="avatar" src=${profile.picture} alt="" loading="lazy" />`
    : html`<span class="avatar" aria-hidden="true"></span>`;

export const renderPersonName = (
  pubkey: string,
  profile: NostrProfile | undefined,
  role?: string
): TemplateResult => html`
  ${renderAvatar(profile)}
  <span class="name">${profileName(pubkey, profile)}</span>
  ${role ? html`<span class="role">${role}</span>` : nothing}
`;
