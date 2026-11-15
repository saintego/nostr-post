import { encodeNaddr } from '@nostr-post/core/nip19';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { postRoleView } from './viewRoles';

const pk = 'a'.repeat(64);
const venue = `30818:${pk}:jam-bangkok-venue`;
const band = `30818:${pk}:westales-musician`;

const manifest = {
  id: 'gig-test',
  version: '1.0.0',
  fields: [
    {
      id: 'performers',
      type: 'ref',
      uiPlugin: 'wiki-entity-picker',
      mapTo: [
        { kind: 31923, target: 'tag', tagName: 'a' },
        { kind: 31923, target: 'content' },
      ],
      metadata: { label: 'Performers', multiple: true },
    },
  ],
} as unknown as NostrPostManifest;

describe('role lines in the view', () => {
  it("name the fields they show, so the tags don't show them again with the other pages", () => {
    const event = {
      kind: 31923,
      content: `A gig\nPerformers: nostr:${encodeNaddr(band)}`,
      tags: [
        ['a', venue],
        ['a', band],
      ],
    };
    const { text, tags, fields } = postRoleView(event as never, manifest);
    expect(text).toBe('A gig');
    expect(fields).toEqual(['performers']);
    // The venue's page stays for its own field, not the performers'
    expect(tags).toEqual([['a', venue]]);
  });

  it('show no fields for a post without role lines', () => {
    const event = { kind: 31923, content: 'A gig', tags: [['a', band]] };
    expect(postRoleView(event as never, manifest).fields).toEqual([]);
  });
});
