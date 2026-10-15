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
  /** Summary of the collapsed section with everything the event contains */
  allData: string;
  /** Infobox rows the manifest has no field for (e.g. added in a newer manifest version) */
  otherFields: string;
  tags: string;
  /** The article's raw source (Djot/Markdown) */
  source: string;
  /** Attribution line for data copied from a source (`source` tag), e.g. OpenStreetMap */
  sourceAttribution: (source: string) => string;
}

export const DEFAULT_WIKI_VIEW_MESSAGES: WikiViewMessages = {
  loading: 'Loading…',
  error: (message) => `Error: ${message}`,
  notFound: 'No entity found.',
  contributors: (count) => `${count} contributor(s)`,
  allVersions: (count) => `All versions (${count})`,
  allData: 'All data',
  otherFields: 'Fields not in this manifest',
  tags: 'Tags',
  source: 'Source',
  links: 'Links',
  externalLink: (provider) => `${provider} ↗`,
  sourceAttribution: (source) =>
    source === 'OpenStreetMap' ? '© OpenStreetMap contributors' : `Data from ${source}`,
};
