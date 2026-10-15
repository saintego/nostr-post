// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

const text = (el: Element) => el.shadowRoot?.textContent?.replace(/\s+/g, ' ') ?? '';
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('composer submit area', async () => {
  await import('./index');
  const { pluginRegistry } = await import('@nostr-post/plugins/registry');

  const make = async (manifest: unknown, prefill: Record<string, unknown>) => {
    const c = document.createElement('nostr-post-composer') as HTMLElement &
      Record<string, unknown>;
    c.manifest = manifest;
    c.autoPublish = true;
    c.pubkey = 'a'.repeat(64);
    c.prefill = prefill;
    document.body.appendChild(c);
    await (c as unknown as { updateComplete: Promise<void> }).updateComplete;
    c.shadowRoot?.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    for (let i = 0; i < 5; i++) await tick();
    await (c as unknown as { updateComplete: Promise<void> }).updateComplete;
    return c;
  };

  it('lists missing required fields next to the button', async () => {
    const manifest = {
      id: 'm',
      version: '1',
      fields: [
        {
          id: 'title',
          type: 'string',
          uiPlugin: 'text',
          required: true,
          mapTo: { kind: 1, target: 'tag', tagName: 'title' },
          metadata: { label: 'Title' },
        },
        { id: 'body', type: 'string', uiPlugin: 'textarea', mapTo: { kind: 1, target: 'content' } },
      ],
    };
    const c = await make(manifest, { body: 'hi' });
    expect(text(c)).toContain('Please fix these fields: Title');
    expect(text(c)).toContain('Create Post');
  });

  it('shows the running step, then a timeout error when a hook never settles', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    pluginRegistry.register({
      id: 'hang',
      type: 'string',
      beforePublish: () => new Promise(() => {}),
    } as never);
    const manifest = {
      id: 'h',
      version: '1',
      fields: [
        { id: 'x', type: 'string', uiPlugin: 'hang', mapTo: { kind: 1, target: 'content' } },
      ],
    };
    const c = document.createElement('nostr-post-composer') as HTMLElement &
      Record<string, unknown>;
    c.manifest = manifest;
    c.autoPublish = true;
    c.pubkey = 'a'.repeat(64);
    c.prefill = { x: 'v' };
    document.body.appendChild(c);
    await (c as unknown as { updateComplete: Promise<void> }).updateComplete;
    c.shadowRoot?.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.advanceTimersByTimeAsync(10);
    await (c as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(text(c)).toContain('Creating...');
    expect(text(c)).toContain('Publishing linked pages…');
    await vi.advanceTimersByTimeAsync(91_000);
    await (c as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(text(c)).toContain('Publishing linked pages took too long');
    expect(text(c)).toContain('Create Post');
    vi.useRealTimers();
  });
});
