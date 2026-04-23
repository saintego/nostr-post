/**
 * Pure submit-flow helpers for <nostr-post-composer>.
 * Separated to keep each file under the 500-line guideline.
 */

import { coordinateEvents } from '@nostr-post/core/coordinator';
import { prepareFormData } from '@nostr-post/core/enrichment';
import { validateManifest } from '@nostr-post/core/manifest';
import { getActiveKinds } from '@nostr-post/core/manifestMappings';
import {
  type EventBundle,
  type FormData as NostrFormData,
  type NostrPostManifest,
  STANDARD_KIND1_POST_MANIFEST,
} from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html } from 'lit';
import { parseExtraTags } from './composerForm';
import { applyReplyTargetToBundle } from './composerReply';
import { type SignedEvent, getUserRelays, signAndPublish } from './signer';

// ---------------------------------------------------------------------------
// Addressable-event helpers
// ---------------------------------------------------------------------------

export const isAddressableKind = (kind: number): boolean => kind >= 30000 && kind < 40000;

export const buildGeneratedDTag = (manifestId: string): string => {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `nostr-post:${manifestId}:${uuid}`;
};

export const resolveAddressableDTag = (
  manifest: NostrPostManifest,
  selectedFormatId: string,
  existingDTag: string | undefined
): string | undefined => {
  const activeKinds = getActiveKinds(manifest, {
    selectedFormatId: selectedFormatId || undefined,
  });
  return activeKinds.some(isAddressableKind)
    ? (existingDTag ?? buildGeneratedDTag(manifest.id))
    : undefined;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ManifestValidationError {
  type: 'manifest';
  message: string;
}

export interface FieldValidationErrors {
  type: 'fields';
  errors: Record<string, string>;
}

export type ValidationResult = ManifestValidationError | FieldValidationErrors | null;

export const validateAndCoordinate = (
  manifest: NostrPostManifest,
  formData: NostrFormData,
  opts: {
    pubkey: string;
    selectedFormatId: string;
    manifestRef?: string;
    dTag?: string;
    extraTags?: string;
    replyToEventId?: string;
    replyToPubkey?: string;
    rootEventId?: string;
    rootPubkey?: string;
  }
):
  | { bundle: EventBundle; addressableDTag: string | undefined }
  | { validationError: ValidationResult } => {
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.success) {
    const message = manifestValidation.error.map((e) => `${e.field}: ${e.message}`).join(', ');
    return { validationError: { type: 'manifest', message: `Invalid manifest: ${message}` } };
  }

  const enrichedData = prepareFormData(manifest, formData, (pluginId) =>
    pluginRegistry.get(pluginId)
  );

  const addressableDTag = resolveAddressableDTag(manifest, opts.selectedFormatId, opts.dTag);

  const result = coordinateEvents(manifest, enrichedData as NostrFormData, {
    pubkey: opts.pubkey,
    createdAt: Math.floor(Date.now() / 1000),
    selectedFormatId: opts.selectedFormatId || undefined,
    manifestRef: opts.manifestRef,
    dTag: addressableDTag,
    tagSerializer: (value, field) => {
      const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
      return plugin?.serializeValue?.(value, field);
    },
    extraTagsFn: (value, field) => {
      const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
      return plugin?.extraTags?.(value, field);
    },
  });

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const err of result.error) {
      errors[err.field] = err.message;
    }
    return { validationError: { type: 'fields', errors } };
  }

  let bundle = applyReplyTargetToBundle(result.data, {
    replyToEventId: opts.replyToEventId,
    replyToPubkey: opts.replyToPubkey,
    rootEventId: opts.rootEventId,
    rootPubkey: opts.rootPubkey,
  });

  const parsedExtraTags = parseExtraTags(opts.extraTags);
  if (parsedExtraTags.length > 0) {
    bundle = {
      ...bundle,
      events: bundle.events.map((event) => ({
        ...event,
        tags: [...event.tags, ...parsedExtraTags],
      })),
    };
  }

  return { bundle, addressableDTag };
};

// ---------------------------------------------------------------------------
// Sign-and-publish bundle
// ---------------------------------------------------------------------------

export const signAndPublishBundle = async (
  bundle: EventBundle,
  relays: string[] | undefined
): Promise<SignedEvent[]> => {
  const resolvedRelays = relays ?? (await getUserRelays());
  const signedEvents: SignedEvent[] = [];
  let primaryEventId: string | undefined;

  for (let i = 0; i < bundle.events.length; i++) {
    const unsignedEvent = bundle.events[i];

    if (i > 0 && primaryEventId) {
      unsignedEvent.tags = [...unsignedEvent.tags, ['e', primaryEventId, '', 'root']];
    }

    const { signedEvent, publishResults } = await signAndPublish(unsignedEvent, resolvedRelays);
    signedEvents.push(signedEvent);

    if (i === 0) {
      primaryEventId = signedEvent.id;
    }

    if (publishResults.success === 0) {
      throw new Error(
        `Failed to publish to any relay: ${publishResults.results.map((r) => r.error).join(', ')}`
      );
    }
  }

  return signedEvents;
};

export const renderSubmitButton = (isSubmitting: boolean, isResolvingManifestRef: boolean) => html`
  <div class="composer-actions">
    <button
      type="submit"
      class="primary"
      ?disabled=${isSubmitting || isResolvingManifestRef}
    >
      ${
        isSubmitting
          ? 'Creating...'
          : isResolvingManifestRef
            ? 'Loading Manifest...'
            : 'Create Post'
      }
    </button>
  </div>
`;

export { STANDARD_KIND1_POST_MANIFEST };
