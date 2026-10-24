/**
 * @nostr-post/plugin-profile - Core entrypoint
 *
 * Import this for headless usage (people values, `p` tags, profile search).
 * Import '@nostr-post/plugin-profile/web' for the input and view components.
 */
export {
  fieldRoles,
  type Person,
  peopleFromTags,
  peopleOf,
  personFromText,
  personTag,
  profilePlugin,
  withoutPerson,
  withPerson,
} from './core';
export {
  DEFAULT_SEARCH_RELAYS,
  type FoundProfile,
  profileName,
  searchProfiles,
} from './search';
