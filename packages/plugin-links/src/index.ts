/**
 * @nostr-post/plugin-links - Core entrypoint
 *
 * Import this for support entries without a UI (checking links and Bitcoin addresses, known tip
 * sites) and the field plugin. Import '@nostr-post/plugin-links/web' for its input and view.
 */
export { linksPlugin } from './core';
export {
  bitcoinAddress,
  bitcoinUri,
  checkSupportLink,
  httpsUrl,
  KNOWN_SUPPORT_SITES,
  type LinkError,
  linkHost,
  parseSupportLink,
  type SupportLink,
  type SupportLinkType,
  type SupportSite,
  supportLinks,
  supportSite,
} from './links';
