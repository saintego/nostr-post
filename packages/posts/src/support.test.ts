import { coordinateEvents } from '@nostr-post/core/coordinator';
import { validateManifest } from '@nostr-post/core/manifest';
import type { SignedEvent } from '@nostr-post/signer';
import { describe, expect, it } from 'vitest';
import {
  listRecipients,
  SUPPORT_D_TAG,
  SUPPORT_MANIFEST,
  supportPageAddress,
  supportPageValues,
} from './support';

const OWNER = 'a'.repeat(64);

describe('support pages', () => {
  it('has a valid manifest', () => {
    expect(validateManifest(SUPPORT_MANIFEST).success).toBe(true);
  });

  it('publishes one addressable event with the values as JSON content', () => {
    const values = { intro: 'Thanks!', lightning: ['alice@getalby.com'] };
    const bundle = coordinateEvents(SUPPORT_MANIFEST, values, {
      pubkey: OWNER,
      dTag: SUPPORT_D_TAG,
    });
    if (!bundle.success) throw new Error('not built');
    const [event] = bundle.data.events;
    expect(event?.kind).toBe(30078);
    expect(event?.tags).toContainEqual(['d', SUPPORT_D_TAG]);
    expect(JSON.parse(event?.content ?? '{}')).toEqual(values);
  });

  it('addresses one page per person', () => {
    expect(supportPageAddress(OWNER)).toBe(`30078:${OWNER}:${SUPPORT_D_TAG}`);
  });

  it('reads the values of a page', () => {
    const links = [{ type: 'link', value: 'https://ko-fi.com/alice' }];
    const event = {
      id: 'e1',
      pubkey: OWNER,
      kind: 30078,
      created_at: 1,
      sig: '',
      tags: [['d', SUPPORT_D_TAG]],
      content: JSON.stringify({ intro: 'Thanks!', lightning: ['alice@getalby.com'], links }),
    } as SignedEvent;
    expect(supportPageValues(event)).toEqual({
      intro: 'Thanks!',
      lightning: ['alice@getalby.com'],
      links,
    });
  });

  it('reads the people of a list once each', () => {
    const b = 'b'.repeat(64);
    expect(
      listRecipients({
        tags: [
          ['d', 'x'],
          ['p', OWNER],
          ['p', 'short'],
          ['p', b],
          ['p', OWNER],
        ],
      })
    ).toEqual([OWNER, b]);
  });
});
