/**
 * User-facing text of <np-profile-input> and <np-profile-view>. Apps can override any of it
 * with the components' `messages` property (e.g. for translations).
 */
export interface ProfileMessages {
  searchPlaceholder: string;
  searching: string;
  noResults: string;
  /** Search failed; the reason follows */
  searchFailed: (reason: string) => string;
  /** Role input of a picked person */
  role: string;
  /** Placeholder of the role input */
  rolePlaceholder: string;
  remove: (name: string) => string;
}

export const DEFAULT_PROFILE_MESSAGES: ProfileMessages = {
  searchPlaceholder: 'Search by name, or paste an npub',
  searching: 'Searching…',
  noResults: 'Nobody found',
  searchFailed: (reason) => `Search failed: ${reason}`,
  role: 'Role',
  rolePlaceholder: 'Role (optional)',
  remove: (name) => `Remove ${name}`,
};
