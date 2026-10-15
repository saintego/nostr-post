// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import './wiki-composer';

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

const manifest = {
  id: 'thing',
  version: '1.0.0',
  fields: [
    {
      id: 'name',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: 30818, target: 'table' },
      metadata: { label: 'Name' },
    },
  ],
};

const text = (el: Element) => el.shadowRoot?.textContent?.replace(/\s+/g, ' ') ?? '';

describe('<nostr-wiki-composer> publishing', () => {
  it('says it waits for the signer while the signature is pending', async () => {
    vi.stubGlobal('WebSocket', EmptyRelay);
    window.nostr = {
      getPublicKey: async () => 'a'.repeat(64),
      signEvent: () => new Promise(() => {}),
    } as unknown as typeof window.nostr;
    const composer = document.createElement('nostr-wiki-composer') as HTMLElement & {
      manifest: unknown;
      autoPublish: boolean;
      prefill: Record<string, unknown>;
      updateComplete: Promise<boolean>;
    };
    composer.manifest = manifest;
    composer.autoPublish = true;
    composer.prefill = { name: 'Something new' };
    document.body.appendChild(composer);
    await composer.updateComplete;
    composer.shadowRoot
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(
      () => expect(text(composer)).toContain('Waiting for your signer to approve…'),
      {
        timeout: 3000,
      }
    );
    vi.unstubAllGlobals();
  });
});
