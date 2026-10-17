/**
 * How <nostr-wiki-composer auto-publish> publishes a page: plugins' publish hooks
 * first (e.g. venue fields creating their venue pages), the page built again with
 * what they linked, signed and published, then the plugins' after-publish steps
 * (e.g. saving it to lists).
 */

import type { NostrPostManifest, UnsignedNostrEvent } from '@nostr-post/core/types';
import { runAfterPublish, runPublishHooks } from '@nostr-post/plugins/publish';
import {
  getPublicKey,
  getPublishRelays,
  type PublishResults,
  publishToRelays,
  type SignedEvent,
  signEvent,
} from '@nostr-post/signer';
import { withHookTags } from './publishSummaries';

export interface WikiPublishInput {
  manifest: NostrPostManifest;
  formData: Record<string, unknown>;
  /** Builds the page from form data (the composer's _buildEvent) */
  build: (formData: Record<string, unknown>) => { unsignedEvent: UnsignedNostrEvent; dTag: string };
  /** Wiki relays (where entities are looked up); the author's own relays are added */
  relays: string[];
  /** Thrown when no relay accepted the page */
  publishFailed: string;
}

export interface WikiPublishResult {
  unsignedEvent: UnsignedNostrEvent;
  dTag: string;
  signedEvent: SignedEvent;
  publishResults: PublishResults;
  /** After-publish steps that failed; the page is out either way */
  afterPublishErrors: Error[];
}

export async function publishWikiPage(input: WikiPublishInput): Promise<WikiPublishResult> {
  const hooks = await runPublishHooks(input.manifest, input.formData, await getPublicKey());
  const { unsignedEvent, dTag } = input.build(hooks.formData);
  unsignedEvent.tags = withHookTags(unsignedEvent.tags as [string, ...string[]][], hooks.tags);
  const signedEvent = await signEvent(unsignedEvent);
  const relays = await getPublishRelays(signedEvent.pubkey, input.relays);
  const publishResults = await publishToRelays(signedEvent, relays);
  if (publishResults.success === 0) throw new Error(input.publishFailed);
  const afterPublishErrors = await runAfterPublish(input.manifest, hooks.formData, {
    pubkey: signedEvent.pubkey,
    events: [signedEvent],
  });
  return { unsignedEvent, dTag, signedEvent, publishResults, afterPublishErrors };
}
