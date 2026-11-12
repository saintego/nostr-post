/**
 * @nostr-post/cdn - article: NIP-23 long-form articles (<nostr-article>, the article manifest).
 */

import '@nostr-post/article/web';

// Long-form articles (NIP-23): <nostr-article>, the article manifest, filters and list cards
export {
  ARTICLE_KIND,
  ARTICLE_MANIFEST,
  type ArticleCard,
  articleCard,
  articleFilter,
  isArticleAddress,
} from '@nostr-post/article';
