// @vitest-environment happy-dom
import { registerEventAction } from '@nostr-post/plugins/entities';
import { describe, expect, it } from 'vitest';
import { eventTarget } from './viewActions';

describe('<nostr-post-view> event actions', () => {
  it("shows plugins' controls for the post's manifest, with its address or id", async () => {
    await import('./index');
    customElements.define(
      'test-post-action',
      class extends HTMLElement {
        target?: string;
      }
    );
    registerEventAction({ tagName: 'test-post-action', matches: (m) => m.id === 'review-test' });
    const view = document.createElement('nostr-post-view') as HTMLElement & Record<string, unknown>;
    view.manifest = { id: 'review-test', version: '1', fields: [] };
    view.event = {
      id: 'e1',
      pubkey: 'pk',
      kind: 1,
      created_at: 1,
      content: 'hi',
      tags: [],
      sig: 's',
    };
    document.body.append(view);
    await (view as unknown as { updateComplete: Promise<void> }).updateComplete;
    const action = view.shadowRoot?.querySelector('test-post-action') as { target?: string } | null;
    expect(action?.target).toBe('e1');
  });

  it('targets addressable events by address', () => {
    expect(
      eventTarget({
        id: 'x',
        pubkey: 'pk',
        kind: 30023,
        created_at: 1,
        content: '',
        tags: [['d', 'a']],
      })
    ).toBe('30023:pk:a');
  });
});
