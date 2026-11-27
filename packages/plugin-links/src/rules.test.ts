import type { PostField } from '@nostr-post/plugins/types';
import { afterEach, describe, expect, it } from 'vitest';
import { linkEntries, linksPlugin, storedEntry } from './core';
import { DEFAULT_EMBED_HOSTS, DEFAULT_LINK_RULES } from './defaultRules';
import {
  isAllowedHost,
  isShowableLink,
  mergeRules,
  normalizeLink,
  safeFieldRules,
  templateHost,
  viewLink,
} from './rules';
import { configureLinks, linkRules } from './settings';

const field = (metadata: Record<string, unknown> = {}): PostField => ({
  id: 'links',
  type: 'object',
  uiPlugin: 'links',
  mapTo: { kind: 30078, target: 'content', path: 'links' },
  metadata,
});

afterEach(() => configureLinks({ rules: undefined, embedHosts: undefined }));

describe('normalizeLink', () => {
  it('adds https:// to bare domains with or without a path', () => {
    expect(normalizeLink('coff.ee/worldtripguide')).toBe('https://coff.ee/worldtripguide');
    expect(normalizeLink(' www.youtube.com/watch?v=dQw4w9WgXcQ ')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    expect(normalizeLink('ko-fi.com')).toBe('https://ko-fi.com');
  });

  it('leaves links with a scheme, addresses and other text as they are', () => {
    expect(normalizeLink('bitcoin:bc1qxyz')).toBe('bitcoin:bc1qxyz');
    expect(normalizeLink('alice@getalby.com')).toBe('alice@getalby.com');
    expect(normalizeLink('not a link')).toBe('not a link');
    expect(normalizeLink('localhost')).toBe('localhost');
  });
});

describe('viewLink', () => {
  it('makes tip sites buttons in their colours', () => {
    const view = viewLink('coff.ee/worldtripguide', DEFAULT_LINK_RULES);
    expect(view).toMatchObject({
      url: 'https://coff.ee/worldtripguide',
      format: 'button',
      rule: { name: 'Buy Me a Coffee', brand: { background: '#ffdd00' } },
    });
    expect(viewLink('https://github.com/sponsors/alice', DEFAULT_LINK_RULES).format).toBe('button');
    expect(viewLink('https://github.com/alice', DEFAULT_LINK_RULES).format).toBe('link');
  });

  it('shows payment and Nostr URIs as QR codes, players as embeds', () => {
    expect(viewLink('bitcoin:bc1qxyz', DEFAULT_LINK_RULES).format).toBe('qr');
    expect(viewLink('youtu.be/dQw4w9WgXcQ', DEFAULT_LINK_RULES)).toMatchObject({
      format: 'embed',
      src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('keeps a player only with an https URL', () => {
    const rules = [
      {
        id: 'x',
        match: '^https://x\\.test/(?<id>\\w+)',
        format: 'embed' as const,
        src: 'http://x.test/{id}',
      },
    ];
    expect(viewLink('https://x.test/abc', rules).format).toBe('link');
  });
});

describe('rules from apps and manifests', () => {
  it('puts the app’s rules first and replaces built-in ones by id', () => {
    configureLinks({
      rules: [{ id: 'ko-fi', match: '^https://(?:www\\.)?ko-fi\\.com/', format: 'link' }],
    });
    expect(viewLink('https://ko-fi.com/alice', linkRules()).format).toBe('link');
    expect(linkRules().filter((rule) => rule.id === 'ko-fi')).toHaveLength(1);
  });

  it('lets a field add buttons, QR codes and links, but not players or bad colours', () => {
    const rules = safeFieldRules([
      {
        id: 'shop',
        match: '^https://shop\\.test/',
        format: 'button',
        name: 'Shop',
        brand: { background: '#123', color: '#fff' },
      },
      { id: 'evil', match: '^https://', format: 'embed', src: 'https://evil.test/{url}' },
      {
        id: 'css',
        match: '^https://css\\.test/',
        format: 'button',
        brand: { background: 'red; x: url(a)', color: '#fff' },
      },
    ]);
    expect(rules.map((rule) => rule.id)).toEqual(['shop', 'css']);
    expect(rules[1]?.brand).toBeUndefined();
    const own = linkRules(
      field({
        rules: [{ id: 'shop', match: '^https://shop\\.test/', format: 'button', name: 'Shop' }],
      })
    );
    expect(viewLink('https://shop.test/a', own)).toMatchObject({
      format: 'button',
      rule: { name: 'Shop' },
    });
  });

  it('merges lists by id, earlier first', () => {
    expect(
      mergeRules(
        [{ id: 'a', match: 'x', format: 'link' }],
        [
          { id: 'a', match: 'y', format: 'qr' },
          { id: 'b', match: 'z', format: 'qr' },
        ]
      ).map((rule) => `${rule.id}:${rule.match}`)
    ).toEqual(['a:x', 'b:z']);
  });
});

describe('entries', () => {
  it('reads links and entries, dropping what no rule shows', () => {
    expect(
      linkEntries([
        'coff.ee/worldtripguide',
        { url: 'https://ko-fi.com/alice', label: 'Coffee', description: ' Thanks ' },
        'javascript:alert(1)',
        'not a link',
      ])
    ).toEqual([
      { url: 'https://coff.ee/worldtripguide' },
      { url: 'https://ko-fi.com/alice', label: 'Coffee', description: 'Thanks' },
    ]);
    expect(isShowableLink('bitcoin:bc1qxyz', DEFAULT_LINK_RULES)).toBe(true);
    expect(isShowableLink('mailto:a@b.c', DEFAULT_LINK_RULES)).toBe(false);
  });

  it('stores a link alone when it has nothing else, and validates entries', () => {
    expect(storedEntry({ url: 'https://a.test' })).toBe('https://a.test');
    expect(storedEntry({ url: 'https://a.test', label: 'A' })).toEqual({
      url: 'https://a.test',
      label: 'A',
    });
    expect(
      linksPlugin.validate?.(['coff.ee/x', { url: 'https://a.test', icon: '🍺' }], field()).success
    ).toBe(true);
    expect(linksPlugin.validate?.([{ label: 'no url' }], field()).success).toBe(false);
    const raw = linksPlugin.serializeValue?.({ url: 'https://a.test', label: 'A' }, field()) ?? '';
    expect(linksPlugin.deserializeValue?.(raw, field())).toEqual({
      url: 'https://a.test',
      label: 'A',
    });
  });
});

describe('players from manifests', () => {
  const peertube = {
    id: 'peertube',
    match: '^https://video\\.example/w/(?<id>\\w+)',
    format: 'embed',
    provider: 'peertube',
    name: 'PeerTube',
    src: 'https://video.example/videos/embed/{id}',
  };

  it('takes a field player only from an allowed host', () => {
    expect(safeFieldRules([peertube], DEFAULT_EMBED_HOSTS)).toEqual([]);
    expect(safeFieldRules([peertube], ['video.example'])).toMatchObject([
      { format: 'embed', provider: 'peertube' },
    ]);
    const youtube = { ...peertube, id: 'yt', src: 'https://www.youtube-nocookie.com/embed/{id}' };
    expect(safeFieldRules([youtube], DEFAULT_EMBED_HOSTS)).toHaveLength(1);
  });

  it('needs a literal host in the template', () => {
    const tricky = [
      { ...peertube, src: 'https://{host}/embed' },
      { ...peertube, src: 'https://video.example.evil.test/embed' },
      { ...peertube, src: 'http://video.example/embed' },
    ];
    expect(safeFieldRules(tricky, ['video.example'])).toEqual([]);
    expect(templateHost('https://a.b.example:8443/x')).toBe('a.b.example');
    expect(isAllowedHost('player.video.example', ['video.example'])).toBe(true);
  });

  it("follows the app's allowed hosts", () => {
    const own = field({ rules: [peertube] });
    expect(viewLink('https://video.example/w/abc', linkRules(own)).format).toBe('link');
    configureLinks({ embedHosts: [...DEFAULT_EMBED_HOSTS, 'video.example'] });
    expect(viewLink('https://video.example/w/abc', linkRules(own))).toMatchObject({
      format: 'embed',
      src: 'https://video.example/videos/embed/abc',
    });
  });
});
