/**
 * User-facing text of <nostr-wiki-view>. Apps can override any of it with the
 * view's `messages` property, e.g. from a translation library.
 */
export interface WikiViewMessages {
  loading: string;
  error: (message: string) => string;
  notFound: string;
  contributors: (count: number) => string;
  allVersions: (count: number) => string;
  /** Label of the row with links to external pages (OpenStreetMap, Google Maps, …) */
  links: string;
  /** Link text for an external page; `provider` is e.g. "OpenStreetMap" */
  externalLink: (provider: string) => string;
  /** Attribution line for data copied from a source (`source` tag), e.g. OpenStreetMap */
  sourceAttribution: (source: string) => string;
}

export const DEFAULT_WIKI_VIEW_MESSAGES: WikiViewMessages = {
  loading: 'Loading…',
  error: (message) => `Error: ${message}`,
  notFound: 'No entity found.',
  contributors: (count) => `${count} contributor(s)`,
  allVersions: (count) => `All versions (${count})`,
  links: 'Links',
  externalLink: (provider) => `${provider} ↗`,
  sourceAttribution: (source) =>
    source === 'OpenStreetMap' ? '© OpenStreetMap contributors' : `Data from ${source}`,
};
