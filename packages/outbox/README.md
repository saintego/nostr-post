# @nostr-post/outbox

Posts that aren't published at once, in one queue ([#268](https://github.com/saintego/nostr-post/issues/268)):

- **Drafts:** a post the user is still working on, unsigned and editable.
- **Timed posts:** signed now, sent at a set time.
- **Upload later:** photos uploaded on wifi or on request, and the post published after.

It depends only on `@nostr-post/signer`. The main entry has no browser dependencies: it works
against a storage interface; `/web` keeps it in the browser and shows the queue.

## Items

An `OutboxItem` holds signed events (`events`, the post first, then the events it links, e.g.
the pages it created), the files to upload first (`uploads`), or, for a draft, unsigned form
data (`draft`). Its `state`:

`draft` → `waiting` → `uploading` → `publishing` → `published` (it leaves the outbox), or `failed`
with the reason in `error` (`attempts` counts them). An item still `uploading` or `publishing`
after `INTERRUPTED_AFTER_SECONDS` (10 minutes) was interrupted (the page closed or was suspended
while it ran, or the signer never answered): `isInterrupted(item)`; it runs again from where it
stopped, files already uploaded stay uploaded. Also in the same page: a run hanging that long is
taken over by the next one, and stops without saving or sending if it ever goes on.

- `signedItem({ pubkey, events, uploads?, title?, sendAt?, wifiOnly? })`, `draftItem({ pubkey, draft, title? })`
- `nextStep(item, { now?, wifi?, force? })`: `'upload'`, `'publish'`, `'wait'` (a timed post's
  time hasn't come, or its files wait for wifi) or `'none'` (a draft, running, failed). `force`
  is the user asking: upload now, retry, send now.
- `withState(item, state, { error? })`, `isLate(item)` (a timed post past its time),
  `waitingFor(item)` (seconds), `titleOf(event)`

Items belong to a pubkey: list and run them per signed-in user, so another signer in the same
browser doesn't see or send them.

## Capturing a publish

`captureEvents(publish)` runs the app's usual publish (e.g. the composer's, with its publish
hooks), but every event it would send is collected instead (signer's `setPublishCapture`). So
pages the venue hub creates and plugins' events are signed now too, and nothing needs the signer
later:

```ts
import { captureEvents, createOutbox, memoryStorage, signedItem } from '@nostr-post/outbox';

const outbox = createOutbox(memoryStorage());
const { events } = await captureEvents(() => publishMyPost());
await outbox.add(signedItem({ pubkey, events }));
// later
await outbox.runAll(pubkey);
```

## The outbox

`createOutbox(storage, jobs?)` returns:

- `list(pubkey?)`, `add(item, files?)` (files by `fileKey`), `update(item)`, `remove(id)` (with its files)
- `run(id, conditions?)`: uploads the item's files (`jobs.upload(upload, file, { signal })`, with the
  authorization signed at capture), then sends its events (`jobs.publish`, default the signer's
  `publishSignedEvents`; in test mode only logged). A published item is removed. A failed one
  keeps the reason and only the events not sent yet, for a retry (`force: true`).
- `cancel(id)`: stops an item uploading or publishing (a hanging upload or signer): the upload's
  `signal` aborts, and the item fails with `CANCELLED` as its error, to retry (files uploaded so
  far stay) or remove
- `runAll(pubkey, conditions?)`: every item with a step to take now
- `subscribe(listener)`: `{ type: 'added' | 'updated' | 'removed', item }` on every change

## Storage

Items and files are kept apart: items are small records that could sync between devices,
files are photos that stay on the device.

- `OutboxItemStore`: `items(pubkey?)`, `putItem`, `removeItem`
- `OutboxFileStore`: `putFile(key, blob)`, `file(key)`, `removeFile`
- `OutboxStorage` is both; `combineStorage(items, files)` makes one from the two, e.g. synced
  items with local files. `memoryStorage()` keeps everything in memory (tests, servers).

## Actions

`itemActions(item)`: what the user can do with it: `'edit'` (a draft), `'upload-now'` (files
waiting for wifi), `'send-now'` (a timed post before its time), `'retry'` (failed or interrupted), `'cancel'` (running), `'remove'` (not while running).
`pendingBytes(item)`: bytes still to upload.

## `/web`

- `indexedDbStorage(name?)`: items and their files in IndexedDB (photos are far too big for
  localStorage). `requestPersistentStorage()` asks the browser to keep the site's data.
- `browserOutbox()`: the page's one outbox, in IndexedDB, with the jobs packages register
  (`registerOutboxJobs({ upload })`, e.g. plugin-media's upload). `setBrowserOutboxItems(store)`,
  before it's first used, keeps its items in another store (e.g. synced); files stay in IndexedDB.
- `startOutboxRunner(outbox?, { pubkey?, intervalMs? })`: runs due items now, every 30 s (timed
  posts), when the browser comes online and when the connection changes; returns `stop()`.
  `ensureOutboxRunner()` starts it once for the browser outbox: the queue element and the composer
  call it; call it at app start so timed posts and waiting uploads go before either is shown.
- `connectionConditions()`: `{ wifi }` from the Network Information API: true on wifi or
  ethernet, false on mobile data or with data saving on, unknown elsewhere (Safari, Firefox,
  desktop Chrome). Items with `wifiOnly` then wait for "Upload now".
- `<nostr-post-outbox>`: the queue. Each item with its thumbnail, title, state, size to upload,
  how long it has waited, a timed post's time (and "late" when the app was closed then), the
  reason it failed, and its actions; "Send all now". Edit fires `outbox-edit` with the item.
  Properties: `outbox` (default `browserOutbox()`), `pubkey` (default the signer's), `messages`
  (`DEFAULT_OUTBOX_MESSAGES`). Dark theme with a `dark` class on an ancestor.

Browsers may clear a site's data: Safari after 7 days without use unless the app is installed on
the home screen. The queue warns when items have waited for days.

## Upload later

Off unless a page wants it: the composer's `upload-later` offers it in media fields (a field's
`uploadLater: false` refuses it), like `drafts` and `schedule`; `setComposerDefaults` of
`@nostr-post/web` turns them on for every composer of the page, also the "Add" dialogs packages
open. A page without them never
queues anything, and shows no outbox. A field prepares a file now and defers it (`deferUpload(upload, file)`): plugin-media shrinks
and hashes the photo, signs its Blossom authorization (kind 24242, for 7 days) and knows its final
URL (`<server>/<sha256>.<ext>`). The composer finds the deferred files its form data uses
(`deferredUploadsIn(formData)`), captures the publish and queues the post with them, `wifiOnly`
(`forgetDeferredUploads` once queued). The outbox uploads them with the upload job (plugin-media
registers `uploadPrepared`), checks the server stored the same hash, and only then publishes:
publishing first would show broken images. `deferredUpload(url)` gives a file not uploaded yet,
e.g. for a preview.

## Drafts

The composer's `drafts` attribute adds "Save draft": `saveDraftItem(outbox, { pubkey, manifest,
formData, dTag?, draftId? })` (`@nostr-post/posts`; `@nostr-post/web`'s `saveDraft` with the
browser outbox) stores a `draft` item with the form data, unsigned, and
the manifest (or a published manifest's address), with its photos to upload later (their files
kept with it). `<nostr-post-outbox>` fires `outbox-edit` for a draft; `openDraft(item)` (`@nostr-post/web`; `draftForComposer(outbox, item)` in posts) gives what
a composer needs (`manifest` or `manifestRef`, `prefill`, `dTag`, `draftId`) and defers its photos
again, so publishing it queues them:

```js
outboxElement.addEventListener('outbox-edit', async (e) => {
  Object.assign(composer, await openDraft(e.detail));
});
```

Publishing the draft from the composer removes it. A draft and the post queued from it share
their photos: removing an item keeps the files another item uses.

## Timed posts

The composer's `schedule` attribute adds "Publish at" (a date and time; empty for now). The post
is signed now and queued with `sendAt` (`queuePost(outbox, formData, pubkey, publish, { sendAt })` in `@nostr-post/posts`):
many relays refuse events dated in the future, so it keeps the signing date. The runner sends it
at its time while the app is open; when the app was closed then, it's sent when it opens and the
queue marks it late (`isLate`). "Send now" sends it before its time. Signing at the time itself
(a NIP-46 remote signer, a server) is #122.

## Sign later

Without a Blossom server (e.g. nostr.build, which chooses the file's URL), the post can't be
signed before the upload. plugin-media then gives the photo a placeholder URL
(`pending:<sha256>.<ext>`) and signs nothing; the composer queues the form unsigned: a
`signLater` item whose `draft` holds the form, the manifest, the composer's options
(`publish`) and relays. When it runs, the outbox uploads the files (the upload job returns each
URL, kept as `uploadedUrl`), then the `sign` job (`signQueuedPost` of `@nostr-post/posts`, registered by
`@nostr-post/web` with its plugin autoload) puts the URLs in the form (`withUploadedUrls`), builds the post as the
composer would, plugins' publish hooks included, and signs it: the signer is asked then, and
must be the item's author. Then the events are sent. If signing fails, the uploaded files stay
uploaded and a retry signs again.
