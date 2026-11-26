/**
 * @nostr-post/cdn - plugins: the field plugins' helpers (geohashes, people, link players, dates,
 * Markdown, media upload and galleries, QR codes, Lightning payments and support links). The plugins' inputs and views load on demand without
 * this; import it for their functions.
 */

// Date field (NIP-52 date tags)
export {
  ALL_DAY_EVENT_KIND,
  type DateValue,
  datePlugin,
  dateValueFromTags,
  dayNumbers,
  formatDateValue,
  guessTimeZone,
  guessTimeZoneOfTags,
  TIMED_EVENT_KIND,
} from '@nostr-post/plugin-date';
// Players for links (YouTube, Spotify, SoundCloud, Vimeo, Bandcamp)
export {
  checkLink,
  checkSuggestedLinks,
  configureEmbedPlugin,
  type Embed,
  embedFor,
  embedPlugin,
  isCheckableLink,
  keepKnownLinks,
  type LinkCheck,
  linkFromEmbedCode,
  linkProvider,
  linksInText,
  namesMatch,
  profileLink,
  profileUrls,
} from '@nostr-post/plugin-embed';
// Geo helpers
export {
  decodeGeohash,
  encodeGeohash,
  type GeoCoordinates,
  type GeoPluginConfig,
  geoPlugin,
} from '@nostr-post/plugin-geo';
// Lightning: pay a Lightning address or npub, as a NIP-57 zap or a plain invoice
export {
  bolt11AmountMsat,
  buildZapRequest,
  canZap,
  fetchPayParams,
  findZapReceipt,
  hasWebln,
  isZapReceiptFor,
  type LightningTarget,
  lightningAddressUrl,
  type Payee,
  type Payment,
  parseLightningTarget,
  payWithWebln,
  requestInvoice,
  requestPayment,
  resolvePayee,
} from '@nostr-post/plugin-lightning';
// Support links: tip pages, on-chain Bitcoin addresses, notes
export {
  bitcoinAddress,
  KNOWN_SUPPORT_SITES,
  type SupportLink,
  supportLinks,
  supportSite,
} from '@nostr-post/plugin-links';
// Markdown as safe HTML (raw HTML shown as text, no script links)
export { renderMarkdown } from '@nostr-post/plugin-markdown';
// Photos and videos of posts (galleries), and the posts referencing events
export {
  eventMedia,
  type MediaItem,
  mediaOfEvents,
  PICTURE_KIND,
  SHORT_VIDEO_KIND,
  VIDEO_KIND,
} from '@nostr-post/plugin-media';
// Media upload (the user's Blossom servers, then nostr.build) and its text (Add media, photo
// quality, progress)
export {
  DEFAULT_MEDIA_GALLERY_MESSAGES,
  DEFAULT_MEDIA_MESSAGES,
  type MediaGalleryMessages,
  type MediaMessages,
  prepareUploadLater,
  setMediaMessages,
  type UploadMediaOptions,
  uploadMedia,
  uploadPrepared,
} from '@nostr-post/plugin-media/web';
// People fields: `p` tags with roles, profile search (NIP-50)
export {
  DEFAULT_SEARCH_RELAYS,
  type FoundProfile,
  mentionsIn,
  type Person,
  peopleFromTags,
  personFromText,
  personTag,
  profileName,
  profilePlugin,
  searchProfiles,
} from '@nostr-post/plugin-profile';
// QR codes of payment and share URIs (lightning:, bitcoin:, nostr:, https:), made locally
export { isQrPayload, QR_SCHEMES, qrSvg } from '@nostr-post/plugin-qr';
