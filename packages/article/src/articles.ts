/**
 * @nostr-post/article - Finding articles on relays, and what a list shows of one. No DOM
 * dependencies.
 */

import { ARTICLE_KIND } from './articleManifest';

/** An article event as far as these functions read it */
export interface ArticleLike {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
}

const ADDRESS_PATTERN = new RegExp(`^${ARTICLE_KIND}:[0-9a-f]{64}:`);

/** Whether an address (`kind:pubkey:d`) is an article's */
export const isArticleAddress = (address: string): boolean => ADDRESS_PATTERN.test(address);

/** Relay filter for articles: by authors and/or topics (`t`), newest first */
export const articleFilter = ({
  authors,
  topics,
  limit = 20,
}: {
  authors?: string[];
  topics?: string[];
  limit?: number;
} = {}): { kinds: number[]; authors?: string[]; '#t'?: string[]; limit: number } => ({
  kinds: [ARTICLE_KIND],
  ...(authors?.length ? { authors } : {}),
  ...(topics?.length ? { '#t': topics.map((t) => t.toLowerCase()) } : {}),
  limit,
});

/** What a list of articles shows of one */
export interface ArticleCard {
  /** `30023:pubkey:d` */
  address: string;
  title: string;
  summary?: string;
  image?: string;
  /** When it was first published (unix seconds): `published_at`, else its version's time */
  publishedAt: number;
  topics: string[];
}

const tagValue = (tags: string[][], name: string): string | undefined =>
  tags.find((t) => t[0] === name && t[1])?.[1];

/** An article as a list card, from its tags */
export const articleCard = (event: ArticleLike): ArticleCard => {
  const d = tagValue(event.tags, 'd') ?? '';
  const published = Number(tagValue(event.tags, 'published_at'));
  const summary = tagValue(event.tags, 'summary');
  const image = tagValue(event.tags, 'image');
  return {
    address: `${event.kind}:${event.pubkey}:${d}`,
    title: tagValue(event.tags, 'title') ?? d,
    ...(summary ? { summary } : {}),
    ...(image ? { image } : {}),
    publishedAt: Number.isFinite(published) && published > 0 ? published : event.created_at,
    topics: event.tags.flatMap((t) => (t[0] === 't' && t[1] ? [t[1]] : [])),
  };
};
