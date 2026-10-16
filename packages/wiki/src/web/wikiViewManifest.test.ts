// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { registerEntityManifest } from '../registry';
import './wiki-view';

/** A relay that answers every REQ with EOSE */
class EmptyRelay {
  onopen?: () => void;
  onmessage?: (message: { data: string }) => void;
  onerror?: () => void;
  constructor() {
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data: string) {
    const [type, subId] = JSON.parse(data) as [string, string];
    if (type !== 'REQ') return;
    setTimeout(() => this.onmessage?.({ data: JSON.stringify(['EOSE', subId]) }), 0);
  }
  close() {}
}

const text = (el: Element) => el.shadowRoot?.textContent?.replace(/\s+/g, ' ') ?? '';

describe('<nostr-wiki-view> without a manifest', () => {
  it('formats a page with the manifest its label names (registered by the app)', async () => {
    vi.stubGlobal('WebSocket', EmptyRelay);
    registerEntityManifest({
      id: 'cafe-entity-test',
      version: '1.0.0',
      fields: [
        {
          id: 'beans',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 30818, target: 'table' },
          metadata: { label: 'Coffee beans' },
        },
      ],
    });
    const view = document.createElement('nostr-wiki-view') as HTMLElement & {
      event: unknown;
      updateComplete: Promise<boolean>;
    };
    view.event = {
      id: 'e1',
      pubkey: 'a'.repeat(64),
      sig: 's',
      kind: 30818,
      created_at: 1,
      content: '| Field | Value |\n|-------|-------|\n| beans | Ethiopia |',
      tags: [
        ['d', 'louvre-cafe'],
        ['L', 'nostr-post'],
        ['l', 'cafe-entity-test', 'nostr-post'],
      ],
    };
    document.body.appendChild(view);
    await vi.waitFor(() => expect(text(view)).toContain('Coffee beans'), { timeout: 5000 });
    vi.unstubAllGlobals();
  });
});
