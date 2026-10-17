// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

describe('ensurePluginsForManifest', () => {
  it("loads a plugin's web entry even when its main entry registered it already", async () => {
    // e.g. a manifest built with listField() from @nostr-post/plugin-list
    await import('@nostr-post/plugin-list');
    const { pluginRegistry } = await import('@nostr-post/plugins/registry');
    expect(pluginRegistry.get('list')?.inputTagName).toBeUndefined();

    const { ensurePluginsForManifest } = await import('./pluginAutoLoad');
    await ensurePluginsForManifest({
      id: 'm',
      version: '1',
      fields: [{ id: 'l', type: 'string', uiPlugin: 'list', mapTo: { kind: 1, target: 'tag' } }],
    });
    expect(pluginRegistry.get('list')?.inputTagName).toBe('np-list-input');
  });
});
