/**
 * @nostr-post/article - main entry (no DOM)
 *
 * NIP-23 long-form articles: the article manifest (kind 30023), relay filters and list cards.
 * `@nostr-post/article/web` adds the article view.
 */

export { ARTICLE_KIND, ARTICLE_MANIFEST } from './articleManifest';
export {
  type ArticleCard,
  type ArticleLike,
  articleCard,
  articleFilter,
  isArticleAddress,
} from './articles';
