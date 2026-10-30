/**
 * @nostr-post/plugin-embed - Core entrypoint
 *
 * Import this for headless usage (link → player URL).
 * Import '@nostr-post/plugin-embed/web' for the input and view components.
 */
export {
  type Embed,
  type EmbedProvider,
  embedFor,
  embedPlugin,
  linkFromEmbedCode,
  linkProvider,
  linksOf,
} from './core';
export { checkLink, isCheckableLink, type LinkCheck, namesMatch } from './linkCheck';
export {
  type ProfileLink,
  type ProfilePlatform,
  profileLink,
  profileUrls,
} from './profileLinks';
