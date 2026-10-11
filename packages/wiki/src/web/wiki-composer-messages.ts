/**
 * User-facing text of <nostr-wiki-composer>. Apps can override any of it with
 * the composer's `messages` property, e.g. from a translation library. Keep it
 * generic: the composer serves every entity type, so examples come from the
 * manifest, not from the text.
 */
export interface WikiComposerMessages {
  noManifest: string;
  loading: string;
  published: string;
  newEntity: string;
  editEntity: (title: string) => string;
  forkingFrom: (pubkey: string) => string;
  titleLabel: string;
  dTagLabel: string;
  selectPlaceholder: string;
  /** Placeholder of the search input of an enum field with a long option list */
  searchPlaceholder: string;
  publish: string;
  publishing: string;
  checkingSlug: string;
  slugFree: (dTag: string) => string;
  /** Shown when a new entity's d-tag belongs to another entity */
  slugTaken: (dTag: string) => string;
  /** Shown when a relay couldn't be asked whether the d-tag is taken */
  slugUnknown: (dTag: string) => string;
  checkAgain: string;
  distinguishBy: string;
  /** Placeholder of the "distinguish by" input; `fieldLabels` are the manifest's fields that could tell entities apart */
  distinguishPlaceholder: (fieldLabels: string[]) => string;
}

export const DEFAULT_WIKI_COMPOSER_MESSAGES: WikiComposerMessages = {
  noManifest: 'No manifest provided.',
  loading: 'Loading entity…',
  published: 'Published successfully.',
  newEntity: 'New entity',
  editEntity: (title) => `Edit: ${title}`,
  forkingFrom: (pubkey) => `Forking from ${pubkey}…`,
  titleLabel: 'Title:',
  dTagLabel: 'd-tag:',
  selectPlaceholder: '— select —',
  searchPlaceholder: 'Type to search…',
  publish: 'Publish',
  publishing: 'Publishing…',
  checkingSlug: 'Checking whether the slug is free…',
  slugFree: (dTag) => `✓ "${dTag}" is free`,
  slugTaken: (dTag) =>
    `"${dTag}" is already used by another entity. Add a detail that tells them apart:`,
  slugUnknown: (dTag) =>
    `Couldn't check whether "${dTag}" is free (a relay didn't answer). If it's taken, publishing adds a version to that entity.`,
  checkAgain: 'Check again',
  distinguishBy: 'Distinguish by',
  distinguishPlaceholder: (fieldLabels) =>
    fieldLabels.length > 0 ? `e.g. ${fieldLabels.join(', ')}` : 'A detail that tells them apart',
};
