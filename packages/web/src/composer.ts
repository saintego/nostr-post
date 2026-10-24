/**
 * @nostr-post/web - <nostr-post-composer> Web Component
 * A universal composer for creating Nostr posts using manifests
 * Supports automatic signing and publishing via NIP-07
 */

import { getActiveKinds, getSelectablePublishFormats } from '@nostr-post/core/manifestMappings';
import { type NostrPostManifest, STANDARD_KIND1_POST_MANIFEST } from '@nostr-post/core/types';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles, NostrPostElement } from './baseComponent';
import type { FieldRenderContext } from './composerField';
import { renderFieldList } from './composerFieldList';
import { buildInitialFormData, isFieldReadonly, renderHiddenFieldErrors } from './composerForm';
import { initialPublishFormatId, renderPublishFormatPicker } from './composerFormatPicker';
import { renderComposerHeader } from './composerHeader';
import { type ComposerMessages, DEFAULT_COMPOSER_MESSAGES } from './composerMessages';
import { hasReplyTarget, renderReplyTargetPanel, updateReplyTargetValue } from './composerReply';
import { composerStyle } from './composerStyle';
import {
  invalidFieldLabels,
  type NostrPostSubmitDetail,
  publishWithHooks,
  renderPublishSummaries,
  renderSubmitArea,
  type ValidationResult,
  validateAndCoordinate,
} from './composerSubmit';

import { ensurePluginsForManifest } from './pluginAutoLoad';
import {
  fetchManifestByATag,
  getPublicKey,
  SIGNING_EVENT,
  type SignedEvent,
  type SigningDetail,
} from './signer';

@customElement('nostr-post-composer')
export class NostrPostComposer extends NostrPostElement {
  static styles = [baseStyles, composerStyle];

  @property({ type: Object })
  manifest?: NostrPostManifest;

  /** Overrides for the submit area's text (e.g. translations) */
  @property({ attribute: false })
  messages?: Partial<ComposerMessages>;

  @property({ type: String })
  pubkey?: string;

  /** Reference to the manifest event on Nostr (a-tag value, e.g. '30078:<pubkey>:<d-tag>') */
  @property({ type: String, attribute: 'manifest-ref' })
  manifestRef?: string;

  /** Explicit d-tag for addressable events (kinds 30000-39999). Reuse this to update an existing post. */
  @property({ type: String, attribute: 'd-tag' })
  dTag?: string;

  /** Auto-sign and publish events (uses NIP-07 window.nostr) */
  @property({ type: Boolean, attribute: 'auto-publish' })
  autoPublish = false;

  /** Custom relay URLs (defaults to popular relays) */
  @property({ type: Array })
  relays?: string[];

  /** Field IDs to completely exclude from the composer */
  @property({ type: Array, attribute: 'exclude-fields' })
  excludeFields?: string[];

  /** Field IDs to show as read-only (value visible but not editable) */
  @property({ type: Array, attribute: 'readonly-fields' })
  readonlyFields?: string[];

  /** Pre-filled values keyed by field ID (merged with field defaultValue, prefill wins) */
  @property({ type: Object })
  prefill?: Record<string, unknown>;

  /** Parent event id for protocol-standard kind 1 replies/comments. */
  @property({ type: String, attribute: 'reply-to-event-id' })
  replyToEventId?: string;

  /** Parent author pubkey for protocol-standard kind 1 replies/comments. */
  @property({ type: String, attribute: 'reply-to-pubkey' })
  replyToPubkey?: string;

  /** Optional root event id when replying deeper in a thread. Defaults to replyToEventId. */
  @property({ type: String, attribute: 'root-event-id' })
  rootEventId?: string;

  /** Optional root author pubkey when replying deeper in a thread. */
  @property({ type: String, attribute: 'root-pubkey' })
  rootPubkey?: string;

  /** Show reply target context panel when reply tags are in use. */
  @property({ type: Boolean, attribute: 'show-reply-target' })
  showReplyTarget = false;

  /** Allow editing reply target ids/pubkeys directly in the composer panel. */
  @property({ type: Boolean, attribute: 'editable-reply-target' })
  editableReplyTarget = false;

  /** Hide the publish format picker even when the manifest offers user-selectable formats. */
  @property({ type: Boolean, attribute: 'hide-publish-format-selector' })
  hidePublishFormatSelector = false;

  /** Pre-select a specific publish format by ID when the composer first renders. */
  @property({ type: String, attribute: 'default-format-id' })
  defaultFormatId?: string;

  /**
   * Extra Nostr tags to append to every published event.
   * Format: "tagname:value,tagname2:value2" (first colon is the separator, so
   * values with colons — e.g. "i:osm:node:1234" — are handled correctly).
   * Can also be set programmatically as a string property.
   */
  @property({ type: String, attribute: 'extra-tags' })
  extraTags?: string;

  @state()
  private _formData!: Record<string, unknown>;

  /** Current form data (read-only accessor for external consumers) */
  get formData(): Record<string, unknown> {
    return this._formData;
  }

  @state()
  private errors!: Record<string, string>;

  @state()
  private isSubmitting!: boolean;

  @state()
  private successMessage!: string;

  /** What the running submit is doing, shown next to the button */
  @state()
  private _submitStep?: string;

  /** The signer is working on a signature (e.g. waiting for the user to approve) */
  @state()
  private _signing = false;

  private readonly _onSigning = (e: CustomEvent<SigningDetail>) => {
    this._signing = e.detail.pending > 0;
  };

  /** Why the last submit failed, shown below the button */
  @state()
  private _submitError?: string;

  private get _m(): ComposerMessages {
    return { ...DEFAULT_COMPOSER_MESSAGES, ...this.messages };
  }

  @state()
  private _expandedFields: Set<string> = new Set();

  @state()
  private isResolvingManifestRef = false;

  @state()
  private selectedPublishFormatId = '';

  constructor() {
    super();
    this._formData = {};
    this.errors = {};
    this.isSubmitting = false;
    this.successMessage = '';
  }

  private getInitialSelectedPublishFormatId(manifest: NostrPostManifest): string {
    return initialPublishFormatId(manifest, this.defaultFormatId, this.hidePublishFormatSelector);
  }

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    const manifestChanged = changed.has('manifest');
    const prefillChanged = changed.has('prefill');
    const manifestRefChanged = changed.has('manifestRef');

    if (manifestChanged || prefillChanged) {
      this.initDefaults({ resetUnknownFields: manifestChanged });
      if (manifestChanged) {
        this.selectedPublishFormatId = this.getInitialSelectedPublishFormatId(
          this.manifest || STANDARD_KIND1_POST_MANIFEST
        );
        this.errors = {};
        this.successMessage = '';
        this._expandedFields = new Set();
        this.dispatchFormChange();
      }
      void this.ensureManifestPlugins();
    }

    if (manifestRefChanged) {
      void this._resolveManifestRef();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(SIGNING_EVENT, this._onSigning);
    void this.ensureManifestPlugins();
  }

  disconnectedCallback(): void {
    window.removeEventListener(SIGNING_EVENT, this._onSigning);
    super.disconnectedCallback();
  }

  private async _resolveManifestRef(): Promise<boolean> {
    if (this.manifest) return true;
    if (!this.manifestRef) return false;

    this.isResolvingManifestRef = true;

    try {
      const stored = await fetchManifestByATag(this.manifestRef, this.relays);
      if (stored) {
        this.manifest = stored.manifest;
        this.initDefaults({ resetUnknownFields: true });
        this.selectedPublishFormatId = this.getInitialSelectedPublishFormatId(stored.manifest);
        this.errors = {};
        this.successMessage = '';
        this._expandedFields = new Set();
        this.dispatchFormChange();
        void this.ensureManifestPlugins();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.isResolvingManifestRef = false;
    }
  }

  private async ensureManifestPlugins() {
    await ensurePluginsForManifest(this.manifest || STANDARD_KIND1_POST_MANIFEST);
    this.requestUpdate();
  }

  private initDefaults({ resetUnknownFields = false }: { resetUnknownFields?: boolean } = {}) {
    const manifest = this.manifest || STANDARD_KIND1_POST_MANIFEST;
    this._formData = buildInitialFormData({
      manifest,
      prefill: this.prefill,
      currentFormData: this._formData,
      resetUnknownFields,
    });
  }

  private dispatchFormChange(): void {
    this.dispatchEvent(
      new CustomEvent('nostr-post-form-change', {
        detail: { formData: this._formData },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleFieldChange(fieldId: string, value: unknown): void {
    const nextFormData = { ...this._formData };
    if (value === undefined) {
      delete nextFormData[fieldId];
    } else {
      nextFormData[fieldId] = value;
    }
    this._formData = nextFormData;
    if (this.errors[fieldId]) {
      const newErrors = { ...this.errors };
      delete newErrors[fieldId];
      this.errors = newErrors;
    }
    this.dispatchFormChange();
  }

  /** Shown below the submit button, and dispatched as `nostr-post-error` */
  protected override showError(message: string): void {
    this._submitError = message;
    super.showError(message);
  }

  private applyValidationError(error: ValidationResult) {
    if (!error) return;
    if (error.type === 'manifest') {
      this.showError(error.message);
    } else {
      this.errors = error.errors;
      void this.updateComplete.then(() =>
        this.shadowRoot?.querySelector('.field-error')?.scrollIntoView({ block: 'center' })
      );
    }
  }

  /** The manifest (resolving `manifestRef` if needed) and pubkey to submit with; shows why not */
  private async _submitContext(): Promise<
    { manifest: NostrPostManifest; pubkey: string } | undefined
  > {
    if (!this.manifest && this.manifestRef) {
      const resolved = await this._resolveManifestRef();
      if (!resolved || !this.manifest) {
        this.showError('Failed to resolve manifestRef. Unable to submit post.');
        return undefined;
      }
    }
    const pubkey = this.pubkey ?? (this.autoPublish ? await getPublicKey() : undefined);
    if (!pubkey) {
      this.showError('No pubkey provided. Please login first.');
      return undefined;
    }
    return { manifest: this.manifest || STANDARD_KIND1_POST_MANIFEST, pubkey };
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.successMessage = '';
    this._submitError = undefined;
    this.errors = {};

    const context = await this._submitContext();
    if (!context) return;
    const { manifest, pubkey } = context;

    this.isSubmitting = true;

    try {
      const outcome = this._coordinate(manifest, this._formData, pubkey);

      if ('validationError' in outcome) {
        this.applyValidationError(outcome.validationError);
        return;
      }

      const { bundle, addressableDTag } = outcome;

      if (this.autoPublish) {
        const { events: signedEvents, afterPublishErrors } = await this._publish(manifest, pubkey);
        this.dispatchCustomEvent<SignedEvent[]>('nostr-post-published', signedEvents);
        this.successMessage =
          signedEvents.length > 0
            ? `Published to ${signedEvents.length} event(s)!`
            : this._m.doneWithoutPost;
        if (afterPublishErrors.length > 0) {
          this.showError(this._m.afterPublishFailed(afterPublishErrors.map((e) => e.message)));
        }
      } else {
        // formData + manifest let the app run plugin hooks itself (runBeforePublish)
        this.dispatchCustomEvent<NostrPostSubmitDetail>('nostr-post-submit', {
          bundle,
          dTag: addressableDTag,
          formData: { ...this._formData },
          manifest,
        });
        this.successMessage = 'Post created successfully!';
      }

      this._formData = {};
    } catch (error) {
      this.showError(error instanceof Error ? error.message : this._m.unknownError);
    } finally {
      this.isSubmitting = false;
      this._submitStep = undefined;
    }
  }

  private _coordinate(
    manifest: NostrPostManifest,
    formData: Record<string, unknown>,
    pubkey: string
  ) {
    return validateAndCoordinate(
      manifest,
      formData as Parameters<typeof validateAndCoordinate>[1],
      {
        pubkey,
        selectedFormatId: this.selectedPublishFormatId,
        manifestRef: this.manifestRef,
        dTag: this.dTag,
        extraTags: this.extraTags,
        replyToEventId: this.replyToEventId,
        replyToPubkey: this.replyToPubkey,
        rootEventId: this.rootEventId,
        rootPubkey: this.rootPubkey,
      }
    );
  }

  /** Plugins' related events first (e.g. a venue's wiki page), then the post */
  private _publish(manifest: NostrPostManifest, pubkey: string) {
    return publishWithHooks({
      manifest,
      formData: this._formData,
      pubkey,
      relays: this.relays,
      coordinate: (formData) => this._coordinate(manifest, formData, pubkey),
      messages: this._m,
      onStep: (step) => {
        this._submitStep = step;
      },
      isSigning: () => this._signing,
    });
  }

  private updateReplyTarget(
    field: 'replyToEventId' | 'replyToPubkey' | 'rootEventId' | 'rootPubkey',
    value: string
  ) {
    this[field] = updateReplyTargetValue(value);
  }

  render() {
    const manifest = this.manifest || STANDARD_KIND1_POST_MANIFEST;
    const selectableFormats = getSelectablePublishFormats(manifest);

    const ctx: Omit<FieldRenderContext, 'attachedByTarget'> = {
      formData: this._formData,
      errors: this.errors,
      expandedFields: this._expandedFields,
      manifest,
      activeKinds: getActiveKinds(manifest, {
        selectedFormatId: this.selectedPublishFormatId || undefined,
      }),
      pubkey: this.pubkey,
      isReadonly: (f) => isFieldReadonly(f, this.readonlyFields),
      onFieldChange: (id, val) => this.handleFieldChange(id, val),
      onToggleExpanded: (fieldId) => {
        const next = new Set(this._expandedFields);
        if (this._expandedFields.has(fieldId)) next.delete(fieldId);
        else next.add(fieldId);
        this._expandedFields = next;
      },
    };

    const replyTarget = {
      replyToEventId: this.replyToEventId,
      replyToPubkey: this.replyToPubkey,
      rootEventId: this.rootEventId,
      rootPubkey: this.rootPubkey,
    };

    const showReplyPanel =
      this.showReplyTarget || this.editableReplyTarget || hasReplyTarget(replyTarget);

    return html`
      <div class="composer">
        ${renderComposerHeader(manifest.metadata)}
        ${this.successMessage ? html`<div class="success-message">${this.successMessage}</div>` : ''}
        ${renderHiddenFieldErrors(manifest, this.errors, this.excludeFields, this.prefill)}
        <form @submit=${this.handleSubmit}>
          ${renderPublishFormatPicker(
            selectableFormats,
            this.selectedPublishFormatId,
            this.hidePublishFormatSelector,
            (id) => {
              this.selectedPublishFormatId = id;
            }
          )}
          ${
            showReplyPanel
              ? renderReplyTargetPanel({
                  target: replyTarget,
                  readonly: !this.editableReplyTarget,
                  onUpdate: (field, value) => this.updateReplyTarget(field, value),
                })
              : ''
          }
          ${renderFieldList(manifest, ctx, this.excludeFields, this.prefill)}
          ${
            this.autoPublish
              ? renderPublishSummaries(manifest, this._formData, (id, val) =>
                  this.handleFieldChange(id, val)
                )
              : ''
          }
          ${renderSubmitArea({
            isSubmitting: this.isSubmitting,
            isResolvingManifestRef: this.isResolvingManifestRef,
            step: this._signing ? this._m.stepSigning : this._submitStep,
            error: this._submitError,
            invalidFields: invalidFieldLabels(manifest, this.errors),
            messages: this._m,
          })}
        </form>
      </div>
    `;
  }
}
