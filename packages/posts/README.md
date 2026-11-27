# @nostr-post/posts

Publishing and reading nostr-post posts without a UI: what `<nostr-post-composer>`,
`<nostr-post-view>` and `<nostr-post-feed>` (`@nostr-post/web`) and the React wrappers build on,
for an app that brings its own UI. No Lit, no React, no DOM: a test checks every module.

It builds on `@nostr-post/core` (manifests, events, comment and update-comment rules),
`@nostr-post/signer` (signing, relays) and `@nostr-post/plugins` (the fields' plugins and their
publish hooks).

```typescript
import {
  DEFAULT_PUBLISH_MESSAGES,
  publishWithHooks,
  validateAndCoordinate,
} from '@nostr-post/posts';

const coordinate = (formData) =>
  validateAndCoordinate(manifest, formData, { pubkey, selectedFormatId: 'note' });
const { events } = await publishWithHooks({
  manifest, formData, pubkey, relays: undefined, coordinate,
  messages: DEFAULT_PUBLISH_MESSAGES, onStep: console.log, isSigning: () => false,
});
```

## Publishing

| Export | Does |
| --- | --- |
| `validateAndCoordinate(manifest, formData, opts)` | Checks the manifest and the fields (also with their plugins: `validateWithPlugins`), builds the post's events (`{ bundle }`) or says what's wrong (`{ validationError }`); `opts` takes the reply target and extra tags |
| `publishWithHooks(input)` | Runs the plugins' publish hooks (e.g. a venue's wiki page, at most `PUBLISH_HOOKS_TIMEOUT_MS`), builds the post again with what they linked, signs and publishes it, then runs their after-publish steps; `{ events, afterPublishErrors }` |
| `signAndPublishBundle(bundle, relays)` | Signs and publishes a bundle's events, a note first; the others link to it (`["e", <id>]`, `bundleSigningOrder`, `linkToPrimary`) |
| `withTags(bundle, tags)` | The tags added to every event of a bundle, without duplicates |
| `waitForUploads(messages, onStep)` | Waits for uploads that add to the form (`@nostr-post/plugins/activity`); throws when one failed |
| `signedInPubkey(pubkey, autoPublish)` | Who publishes; asks the app to sign the user in when no one is (`requestSignIn`) |
| `resolveAddressableDTag`, `buildGeneratedDTag`, `isAddressableKind` | The d-tag of an addressable post (kind 30000–39999) |
| `invalidFieldLabels(manifest, errors)` | The labels of the fields with an error, in manifest order |
| `PublishMessages`, `DEFAULT_PUBLISH_MESSAGES` | What publishing says while it runs and when it fails, to override (translations) |
| `NostrPostSubmitDetail` | The composer's `nostr-post-submit` detail, for apps that publish it themselves |

## A composer's form

| Export | Does |
| --- | --- |
| `buildInitialFormData({ manifest, prefill, currentFormData, resetUnknownFields })` | Defaults, then the prefill, then what's typed |
| `isFieldExcluded`, `isExcludedButPrefilled`, `isFieldReadonly`, `hiddenFieldErrorEntries` | Hidden and read-only fields, and the errors of hidden ones |
| `parseExtraTags(input)` | Extra tags written as JSON |

## Replies, threads and reactions

| Export | Does |
| --- | --- |
| `ReplyTarget`, `buildReply(target)`, `buildReplyTags(target)`, `applyReplyTargetToBundle(bundle, target)` | A reply's kind and tags: a kind-1 reply (NIP-10) to a note, a NIP-22 comment (kind 1111) to anything else |
| `buildReplyTarget(event, root?)`, `hasReplyTarget`, `updateReplyTargetValue` | The reply target for replying to an event |
| `buildThreads(posts, interactions)` | Posts with their comments and reactions, the newest version of each addressable post; comments and reactions on earlier versions count for it |
| `FeedThread`, `addressOf(event)`, `mergeUniqueEvents` | Threads' shape, an addressable event's address, merging events |
| `buildReactionEvent(event, reaction, pubkey)` | A NIP-25 reaction (`e`, `p`, `k`, and `a` on addressable events) |
| `publishReaction({ event, reaction, relays, interactionEvents, profileMap })` | Signs and publishes one, with the reactor's profile |
| `summarizeReactions`, `summarizeReactionsWithAuthors`, `DEFAULT_REACTION_OPTIONS`, `DEFAULT_COMMENT_MANIFEST` | Counts per reaction; the feed's defaults |

## Feeds

| Export | Does |
| --- | --- |
| `buildFeedFilters(query)`, `buildFetchFilter`, `buildFetchFilters`, `parseFilterTags`, `FeedQuery` | Relay filters for a feed (authors, kinds, tags, …) |
| `interactionFilters(events, { comments, reactions })` | Relay filters for their comments and reactions, also of earlier versions (`#A`, `#a`) |
| `fetchFeedEvents(filters, options)`, `MAX_AUTHOR_RELAY_LOOKUPS` | Loads events from the given relays, or the defaults and then the authors' NIP-65 relays |
| `buildInteractionLoadKey`, `mergeUniqueEventsById` | When to reload interactions; merging by id |
| `loadProfilesForEvents`, `authorDisplayName`, `displayNameForPubkey`, `truncatePubkey` | Author names |
| `getUserRelays()`, `getDefaultRelays()` | The signed-in user's relays to publish to |

## A post's raw data

| Export | Does |
| --- | --- |
| `eventTitle(event, maxLength?)` | A short name of an event for lists: its `title` or `name` tag, else its d tag, else the start of its text |
| `rawEventData(event, relays?)`, `RawEventData` | What a post's "⋯" menu copies and shows: the author's npub, kind, d tag, tags, an naddr (addressable) or nevent with relay hints, the relays it was found on (default: `relaysSeenOn`, `@nostr-post/signer`), the JSON and the signature |

## Posts that wait in an outbox

With `@nostr-post/outbox`; the outbox is passed in (in a browser `browserOutbox()` of
`@nostr-post/outbox/web`, which `@nostr-post/web`'s composer uses).

| Function | What it does |
| --- | --- |
| `queuePost(outbox, formData, pubkey, publish, { sendAt?, signLater? })` | Publishes, or queues the post: when the form uses files that upload later (`deferredUploadsIn`) or `sendAt` is later. Files with a final URL (Blossom): the publish is captured, hooks included, and queued signed. Files without one: the form is queued unsigned with `signLater` (`{ manifest, options, relays }`). Returns `{ published, queued? }`; the caller runs the item |
| `signQueuedPost(item, { ensurePlugins?, messages? })` | The outbox's `sign` job: builds a sign-later post with its uploaded URLs as a composer would, publish hooks included, and signs it (the signer must be the item's author) |
| `saveDraftItem(outbox, { pubkey, manifest, formData, dTag?, draftId? })` | Saves a form as a draft, unsigned, with its photos to upload later |
| `draftForComposer(outbox, item)` | A draft's `manifest` or `manifestRef`, `prefill`, `dTag` and `draftId` for a composer; its photos deferred again |
| `draftTitle(formData)` | A draft's name: the form's first text |

## Editing with update comments

| Export | Does |
| --- | --- |
| `extractPrefillFromEvent(event, manifest)` | An event's values as form data, to edit it in a composer |
| `formatPrefillAsUpdateComment(manifest, kind, values, original)` | The update comment for the changed values |
| `appliedUpdates(interactions, editors)` | The editors' updates, line by line, e.g. to list them under the post |

Parsing and applying update comments is `@nostr-post/core/eventUpdates`.
