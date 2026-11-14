/**
 * @nostr-post/outbox - The outbox: adding, listing, running and removing items
 *
 * `createOutbox(storage, jobs)` keeps items in `storage` and runs them: uploads their files
 * (the `upload` job, e.g. plugin-media's Blossom upload with the authorization signed at
 * capture), then sends their events (`publishSignedEvents`), and removes them once published.
 * Listeners hear about every change, e.g. a queue element.
 */

import {
  publishSignedEvents,
  type SignedEntry,
  type SignedPublishResult,
} from '@nostr-post/signer';
import {
  isInterrupted,
  nextStep,
  nowSeconds,
  type OutboxItem,
  type OutboxUpload,
  type RunConditions,
  withState,
} from './item';
import type { OutboxStorage } from './storage';

export interface OutboxJobs {
  /**
   * Uploads a file (with its authorization signed at capture, or signing now); resolves with its
   * URL once the server has it (with the same hash), throws with the reason otherwise. `signal`
   * aborts when the user cancels the run
   */
  upload?: (
    upload: OutboxUpload,
    file: Blob,
    options?: { signal?: AbortSignal }
  ) => Promise<string | undefined>;
  /**
   * Builds and signs a sign-later item's events from its form (`draft`, with the uploaded URLs
   * in it, `withUploadedUrls`), without sending them: the post first, then what its publish made
   */
  sign?: (item: OutboxItem) => Promise<SignedEntry[]>;
  /** Sends signed events; default `publishSignedEvents` (in test mode only logged) */
  publish?: (entries: SignedEntry[]) => Promise<SignedPublishResult[]>;
}

/** What changed: an item added, updated (its state) or removed (published or by the user) */
export interface OutboxChange {
  type: 'added' | 'updated' | 'removed';
  item: OutboxItem;
}

export interface Outbox {
  /** The items, oldest first; only `pubkey`'s when given */
  list(pubkey?: string): Promise<OutboxItem[]>;
  /** Adds an item with its files (by `fileKey`) */
  add(item: OutboxItem, files?: Record<string, Blob>): Promise<OutboxItem>;
  /** Replaces an item, e.g. an edited draft */
  update(item: OutboxItem): Promise<OutboxItem>;
  /** Removes an item and its files */
  remove(id: string): Promise<void>;
  /** An item's file, e.g. for a thumbnail */
  file(key: string): Promise<Blob | undefined>;
  /** Runs an item's next step (`nextStep`): uploads, then publishes; the item as it ends */
  run(id: string, conditions?: RunConditions): Promise<OutboxItem | undefined>;
  /**
   * Stops an item uploading or publishing (a hanging upload or signer): the run is aborted, the
   * item fails as cancelled and can be retried (files uploaded so far stay) or removed
   */
  cancel(id: string): Promise<OutboxItem | undefined>;
  /** Runs every item of `pubkey` that has a step to take now, one after the other */
  runAll(pubkey: string, conditions?: RunConditions): Promise<OutboxItem[]>;
  /** Hears every change; returns the function that stops it */
  subscribe(listener: (change: OutboxChange) => void): () => void;
}

/** The error of a run the user cancelled */
export const CANCELLED = 'Cancelled';

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The outbox over `storage`. `jobs` may be a function, read when an item runs, so jobs
 * registered later (e.g. plugin-media's upload) apply
 */
export function createOutbox(
  storage: OutboxStorage,
  jobsOrGetter: OutboxJobs | (() => OutboxJobs) = {}
): Outbox {
  const jobsNow = (): OutboxJobs =>
    typeof jobsOrGetter === 'function' ? jobsOrGetter() : jobsOrGetter;
  const listeners = new Set<(change: OutboxChange) => void>();
  const notify = (type: OutboxChange['type'], item: OutboxItem) => {
    for (const listener of listeners) listener({ type, item });
  };
  const save = async (item: OutboxItem): Promise<OutboxItem> => {
    await storage.putItem(item);
    notify('updated', item);
    return item;
  };
  // Files another item uses stay (a draft and the post queued from it share their photos)
  const removeWithFiles = async (item: OutboxItem): Promise<void> => {
    await storage.removeItem(item.id);
    const used = new Set((await storage.items()).flatMap((i) => i.uploads.map((u) => u.fileKey)));
    await Promise.all(
      item.uploads.filter((u) => !used.has(u.fileKey)).map((u) => storage.removeFile(u.fileKey))
    );
    notify('removed', item);
  };
  // Items running now, by the run's token: a second run of the same item does nothing, unless
  // the item is interrupted (`isInterrupted`: a run hanging, e.g. on a signer that never
  // answered); the new run then takes over, and the old one stops if it ever goes on
  const running = new Map<string, object>();
  // The running uploads' aborts, by item id
  const aborts = new Map<string, AbortController>();
  const abandoned = new Error('Run taken over');
  const checkOwner = (id: string, token: object) => {
    if (running.get(id) !== token) throw abandoned;
  };

  const upload = async (item: OutboxItem, token: object): Promise<OutboxItem> => {
    let current = await save(withState(item, 'uploading'));
    const jobs = jobsNow();
    for (const file of current.uploads.filter((u) => !u.uploaded)) {
      if (!jobs.upload) throw new Error('No upload job');
      const blob = await storage.file(file.fileKey);
      if (!blob) throw new Error(`The file of ${file.name ?? file.url} is gone`);
      const url = await jobs.upload(file, blob, { signal: aborts.get(item.id)?.signal });
      checkOwner(item.id, token);
      current = await save({
        ...current,
        uploads: current.uploads.map((u) =>
          u === file ? { ...u, uploaded: true, ...(url ? { uploadedUrl: url } : {}) } : u
        ),
      });
    }
    return current;
  };

  /** A sign-later item with its events, signed now from its form */
  const sign = async (item: OutboxItem, token: object): Promise<OutboxItem> => {
    const { sign: signJob } = jobsNow();
    if (!signJob) throw new Error('No sign job');
    const events = await signJob(item);
    checkOwner(item.id, token);
    if (events.length === 0) throw new Error('Nothing was signed');
    return save({ ...item, events, signLater: false });
  };

  const publish = async (item: OutboxItem, token: object): Promise<OutboxItem> => {
    const signed = item.events.length === 0 && item.signLater ? await sign(item, token) : item;
    const current = await save(withState(signed, 'publishing'));
    const results = await (jobsNow().publish ?? ((e) => publishSignedEvents(e)))(current.events);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      const published = withState(current, 'published');
      await removeWithFiles(published);
      return published;
    }
    // Published events leave the item: a retry sends the others
    const sent = new Set(results.filter((r) => r.ok).map((r) => r.id));
    return save(
      withState(
        { ...current, events: current.events.filter((e) => !sent.has(e.event.id)) },
        'failed',
        { error: failed.map((r) => r.error).join('; ') }
      )
    );
  };

  const find = async (id: string) => (await storage.items()).find((i) => i.id === id);

  /** Uploads then publishes, as the run `token`; a failure is kept on the item */
  const runSteps = async (item: OutboxItem, step: 'upload' | 'publish', token: object) => {
    let current = item;
    try {
      if (step === 'upload') current = await upload(current, token);
      return await publish(current, token);
    } catch (error) {
      // Taken over or cancelled: the item's state is the new run's, or the cancel's
      if (error === abandoned || running.get(item.id) !== token) return find(item.id);
      const latest = (await find(item.id)) ?? current;
      return save(withState(latest, 'failed', { error: message(error) }));
    }
  };

  const run = async (id: string, conditions: RunConditions = {}) => {
    const item = await find(id);
    if (!item || (running.has(id) && !isInterrupted(item, conditions.now))) return item;
    const step = nextStep(item, conditions);
    if (step !== 'upload' && step !== 'publish') return item;
    const token = {};
    running.set(id, token);
    aborts.set(id, new AbortController());
    try {
      return await runSteps(item, step, token);
    } finally {
      if (running.get(id) === token) {
        running.delete(id);
        aborts.delete(id);
      }
    }
  };

  // The run (here, or one lost with an earlier page) is abandoned: `checkOwner` stops it
  const cancel = async (id: string) => {
    running.delete(id);
    aborts.get(id)?.abort();
    aborts.delete(id);
    const item = await find(id);
    if (!item || (item.state !== 'uploading' && item.state !== 'publishing')) return item;
    return save(withState(item, 'failed', { error: CANCELLED }));
  };

  return {
    list: (pubkey) => storage.items(pubkey),
    add: async (item, files = {}) => {
      for (const [key, file] of Object.entries(files)) await storage.putFile(key, file);
      await storage.putItem(item);
      notify('added', item);
      return item;
    },
    update: (item) => save({ ...item, updatedAt: nowSeconds() }),
    remove: async (id) => {
      const item = (await storage.items()).find((i) => i.id === id);
      if (item) await removeWithFiles(item);
    },
    file: (key) => storage.file(key),
    run,
    cancel,
    runAll: async (pubkey, conditions = {}) => {
      const ran: OutboxItem[] = [];
      for (const item of await storage.items(pubkey)) {
        const step = nextStep(item, conditions);
        if (step === 'upload' || step === 'publish') {
          const result = await run(item.id, conditions);
          if (result) ran.push(result);
        }
      }
      return ran;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
