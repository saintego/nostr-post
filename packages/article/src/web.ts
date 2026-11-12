/**
 * @nostr-post/article/web
 *
 * Importing this module defines <nostr-article> (one article by address) and makes it the kind
 * view of 30023 (`@nostr-post/plugins/entities`): a post linking an article shows it.
 */

import { registerKindView } from '@nostr-post/plugins/entities';
import { ARTICLE_KIND } from './articleManifest';

import './web/article';

registerKindView({ kinds: [ARTICLE_KIND], tagName: 'nostr-article' });

export { NostrArticle } from './web/article';
