/**
 * User-facing text of <wiki-entity-picker>. Apps can override any of it with
 * the picker's `messages` property, e.g. from a translation library. Keep it
 * generic: the picker serves every entity type.
 */
export interface WikiEntityPickerMessages {
  searchPlaceholder: string;
  /** Accessible label of the search input */
  searchLabel: string;
  searching: string;
  noResults: (query: string) => string;
  /** Shown when the d-tag "Create" would produce is taken by a listed entity */
  alreadyExists: (dTag: string) => string;
  create: (query: string) => string;
  /** "Create" when an entity with the name exists */
  createAnother: (query: string) => string;
  distinctSlug: string;
  /** Title of the create dialog; `typeName` from the manifest, if it has one */
  createDialogTitle: (typeName?: string) => string;
  versions: (count: number) => string;
  preview: string;
  previewLabel: (dTag: string) => string;
  remove: string;
  close: string;
  /** Shown on a picked entity that has no page yet */
  noPage: string;
  /** Creates the page of a picked entity that has none */
  createPage: string;
  /** Next to the publish button: create the page of an entity that has none */
  createOnPublish: (name: string) => string;
  /** Under it, for an entity known only by its name */
  nameOnly: string;
  /** On a picked entity whose page was found automatically: how, and to check it */
  foundBy: (by: 'link' | 'name') => string;
  /** In its preview: the page is this entity's */
  itsThem: string;
  /** In its preview: it isn't, keep the entity without the page */
  notThem: string;
  /** Next to the publish button: a found page not checked yet */
  checkFound: (name: string) => string;
}

export const DEFAULT_WIKI_ENTITY_PICKER_MESSAGES: WikiEntityPickerMessages = {
  searchPlaceholder: 'Search entities…',
  searchLabel: 'Search for an entity',
  searching: 'Searching…',
  noResults: (query) => `No entities found for "${query}"`,
  alreadyExists: (dTag) => `"${dTag}" already exists (above).`,
  create: (query) => `+ Create "${query}"`,
  createAnother: (query) => `+ Create another "${query}"`,
  distinctSlug: 'with a distinct slug',
  createDialogTitle: (typeName) => `Create ${typeName ?? 'entity'}`,
  versions: (count) => `${count} version${count === 1 ? '' : 's'}`,
  preview: 'Preview',
  previewLabel: (dTag) => `Preview ${dTag}`,
  remove: 'Remove',
  close: 'Close',
  noPage: 'no page yet',
  createPage: 'Create page',
  createOnPublish: (name) => `Also create the page of ${name}`,
  nameOnly: 'Only a name, no links: tick it if you are sure who it is',
  foundBy: (by) => (by === 'link' ? 'found by its links: check it' : 'found by its name: check it'),
  itsThem: "It's them",
  notThem: 'Not them',
  checkFound: (name) => `Check that the page found for ${name} is theirs (👁 next to it)`,
};
