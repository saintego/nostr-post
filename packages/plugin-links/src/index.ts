/**
 * @nostr-post/plugin-links - Core entrypoint
 *
 * Import this for links without a UI: the rules that decide how a link shows (players, sites'
 * buttons, QR codes, links), players for links, profile links and link checks, and the field
 * plugin. Import '@nostr-post/plugin-links/web' for the elements.
 */
export {
  type Embed,
  type EmbedProvider,
  embedFor,
  type LinkEntry,
  linkEntries,
  linkFromEmbedCode,
  linkProvider,
  linksOf,
  linksPlugin,
  parseLinkEntry,
  storedEntry,
} from './core';
export { DEFAULT_EMBED_HOSTS, DEFAULT_LINK_RULES } from './defaultRules';
export { checkLink, isCheckableLink, type LinkCheck, namesMatch } from './linkCheck';
export {
  checkSuggestedLinks,
  keepKnownLinks,
  linkKey,
  linksInText,
  type SuggestedLink,
} from './linkGuard';
export {
  type ProfileLink,
  type ProfilePlatform,
  profileLink,
  profileUrls,
} from './profileLinks';
export {
  fillTemplate,
  findRule,
  isAllowedHost,
  isShowableLink,
  type LinkFormat,
  type LinkRule,
  type LinkView,
  mergeRules,
  normalizeLink,
  safeFieldRules,
  templateHost,
  viewLink,
} from './rules';
export {
  configureLinks,
  type LinksSettings,
  linkRules,
  linksSettings,
  linkText,
  showsUrl,
} from './settings';
