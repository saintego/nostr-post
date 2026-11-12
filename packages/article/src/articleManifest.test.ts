import { coordinateEvents } from '@nostr-post/core/coordinator';
import { prepareFormData } from '@nostr-post/core/enrichment';
import { validateManifest } from '@nostr-post/core/manifest';
import type { PostField } from '@nostr-post/core/types';
import { datePlugin } from '@nostr-post/plugin-date';
import { describe, expect, it } from 'vitest';
import { ARTICLE_MANIFEST } from './articleManifest';
import { articleCard, articleFilter, isArticleAddress } from './articles';

const config = {
  pubkey: 'a'.repeat(64),
  dTag: 'interview',
  tagSerializer: (value: unknown, field: PostField) =>
    field.uiPlugin === 'date' ? datePlugin.serializeValue?.(value, field) : undefined,
};

const publish = (formData: Record<string, unknown>) => {
  const prepared = prepareFormData(ARTICLE_MANIFEST, formData, (id) =>
    id === 'date' ? datePlugin : undefined
  );
  const result = coordinateEvents(ARTICLE_MANIFEST, prepared, config);
  if (!result.success) throw new Error(JSON.stringify(result.error));
  const [event] = result.data.events;
  if (!event) throw new Error('no event');
  return event;
};

describe('ARTICLE_MANIFEST', () => {
  it('is a valid manifest', () => {
    expect(validateManifest(ARTICLE_MANIFEST).success).toBe(true);
  });

  it('publishes a NIP-23 article: Markdown content and its tags', () => {
    const event = publish({
      title: 'An interview',
      summary: 'Talking to the band',
      body: '# Hello\n\nSome **text**.',
      tags: ['music'],
      published: { start: '2026-11-01T10:00', tzid: 'UTC' },
    });
    expect(event.kind).toBe(30023);
    expect(event.content).toBe('# Hello\n\nSome **text**.');
    expect(event.tags).toEqual(
      expect.arrayContaining([
        ['d', 'interview'],
        ['title', 'An interview'],
        ['summary', 'Talking to the band'],
        ['t', 'music'],
        ['published_at', String(Date.UTC(2026, 10, 1, 10) / 1000)],
      ])
    );
  });

  it('dates a new article when it is published', () => {
    const before = Math.floor(Date.now() / 1000) - 60;
    const event = publish({ title: 'New', body: 'Text' });
    const publishedAt = Number(event.tags.find((t) => t[0] === 'published_at')?.[1]);
    expect(publishedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('articles', () => {
  it('tells article addresses', () => {
    expect(isArticleAddress(`30023:${'a'.repeat(64)}:x`)).toBe(true);
    expect(isArticleAddress(`30818:${'a'.repeat(64)}:x`)).toBe(false);
  });

  it('finds articles by authors and topics', () => {
    expect(articleFilter({ authors: ['pk'], topics: ['Music'] })).toEqual({
      kinds: [30023],
      authors: ['pk'],
      '#t': ['music'],
      limit: 20,
    });
  });

  it('makes a list card: the first publishing date, else the version time', () => {
    const event = {
      kind: 30023,
      pubkey: 'pk',
      created_at: 200,
      tags: [
        ['d', 'x'],
        ['title', 'T'],
        ['published_at', '100'],
        ['t', 'a'],
      ],
    };
    expect(articleCard(event)).toEqual({
      address: '30023:pk:x',
      title: 'T',
      publishedAt: 100,
      topics: ['a'],
    });
    expect(articleCard({ ...event, tags: [['d', 'x']] }).publishedAt).toBe(200);
  });
});
