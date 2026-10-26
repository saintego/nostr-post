// Entity manifests for plugins (the list field finding a venue type's lists)
import '../entityManifests';
import { registerKindView } from '@nostr-post/plugins/entities';
import { WIKI_KIND } from '../nip54';
import './wikiView';

// A post linking a wiki page (`nostr:naddr…`) shows the page
registerKindView({ kinds: [WIKI_KIND], tagName: 'nostr-wiki-view' });

export { NostrWikiView } from './wikiView';
export { NostrWikiComposer } from './wikiComposer';
export {
  DEFAULT_WIKI_COMPOSER_MESSAGES,
  type WikiComposerMessages,
} from './wikiComposerMessages';
export {
  DEFAULT_WIKI_VIEW_MESSAGES,
  type WikiViewMessages,
} from './wikiViewMessages';
export { NostrWikiRelated } from './wikiRelated';
export { DEFAULT_WIKI_RELATED_MESSAGES, type WikiRelatedMessages } from './relatedMessages';
