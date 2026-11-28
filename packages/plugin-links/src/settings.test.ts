import type { PostField } from '@nostr-post/plugins/types';
import { afterEach, describe, expect, it } from 'vitest';
import { configureLinks, linkText, showsUrl } from './settings';

const field = (metadata: Record<string, unknown> = {}) =>
  ({ id: 'media', type: 'string', uiPlugin: 'links', metadata }) as unknown as PostField;

afterEach(() => configureLinks({ showUrl: undefined }));

describe("a player's link", () => {
  it('shows by default', () => {
    expect(showsUrl()).toBe(true);
    expect(showsUrl(field())).toBe(true);
  });

  it("follows the app's setting, then the field's, then the element's own choice", () => {
    configureLinks({ showUrl: false });
    expect(showsUrl(field())).toBe(false);
    expect(showsUrl(field({ showUrl: true }))).toBe(true);
    expect(showsUrl(field({ showUrl: true }), false)).toBe(false);
  });

  it('reads as host and path', () => {
    expect(linkText('https://www.youtube.com/watch?v=abc')).toBe('youtube.com/watch?v=abc');
    expect(linkText('https://westales.bandcamp.com/')).toBe('westales.bandcamp.com');
  });
});
