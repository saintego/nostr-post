/**
 * @nostr-post/web - <nostr-post-composer> Web Component
 * A universal composer for creating Nostr posts using manifests
 * Supports automatic signing and publishing via NIP-07
 */

import { coordinateEvents } from '@nostr-post/core/coordinator';
import { prepareFormData } from '@nostr-post/core/enrichment';
import { validateManifest } from '@nostr-post/core/manifest';
import {
  getDefaultPublishFormat,
  getSelectablePublishFormats,
} from '@nostr-post/core/manifestMappings';
import {
  type EventBundle,
  type FormData as NostrFormData,
  type NostrPostManifest,
  type PostField,
  type PublishFormat,
  STANDARD_KIND1_POST_MANIFEST,
} from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { NostrPostElement, baseStyles } from './base-component';
import { type FieldRenderContext, renderExpandableField, renderField } from './composerField';
import {
  buildInitialFormData,
  hiddenFieldErrorEntries,
  isExcludedButPrefilled,
  isFieldExcluded,
  isFieldReadonly,
  parseExtraTags,
} from './composerForm';
import {
  applyReplyTargetToBundle,
  hasReplyTarget,
  renderReplyTargetPanel,
  updateReplyTargetValue,
} from './composerReply';
import { composerStyle } from './composerStyle';
import { ensurePluginsForManifest } from './pluginAutoLoad';
import {
  type SignedEvent,
  fetchManifestByATag,
  getPublicKey,
  getUserRelays,
  signAndPublish,
} from './signer';
@customElement('nostr-post-composer')
export class NostrPostComposer extends NostrPostElement {
  static styles = [baseStyles, composerStyle];

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ type: String })
  pubkey?: string;

  /** Reference to the manifest event on Nostr (a-tag value, e.g. '30078:<pubkey>:<d-tag>') */
  @property({ type: String, attribute: 'manifest-ref' })
  manifestRef?: string;

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

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    const manifestChanged = changed.has('manifest');
    const prefillChanged = changed.has('prefill');
    const manifestRefChanged = changed.has('manifestRef');

    if (manifestChanged || prefillChanged) {
      this.initDefaults({ resetUnknownFields: manifestChanged });
      if (manifestChanged) {
        this.selectedPublishFormatId =
          getDefaultPublishFormat(this.manifest || STANDARD_KIND1_POST_MANIFEST)?.id ?? '';
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
    void this.ensureManifestPlugins();
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
        this.selectedPublishFormatId = getDefaultPublishFormat(stored.manifest)?.id ?? '';
        this.errors = {};
        this.successMessage = '';
        this._expandedFields = new Set();
        this.dispatchFormChange();
        void this.ensureManifestPlugins();
        return true;
      }
      return false;
    } catch (err) {
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

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.successMessage = '';
    this.errors = {};

    // If manifestRef is provided, resolve it before using fallback manifest.
    if (!this.manifest && this.manifestRef) {
      const resolved = await this._resolveManifestRef();
      if (!resolved || !this.manifest) {
        this.showError('Failed to resolve manifestRef. Unable to submit post.');
        return;
      }
    }

    // Use default Kind 1 manifest if none provided
    const manifest = this.manifest || STANDARD_KIND1_POST_MANIFEST;

    // Validate manifest
    const manifestValidation = validateManifest(manifest);
    if (!manifestValidation.success) {
      const errorMessages = manifestValidation.error
        .map((err) => `${err.field}: ${err.message}`)
        .join(', ');
      this.showError(`Invalid manifest: ${errorMessages}`);
      return;
    }

    this.isSubmitting = true;

    try {
      // Get pubkey from prop or NIP-07
      let pubkey = this.pubkey;
      if (!pubkey && this.autoPublish) {
        pubkey = await getPublicKey();
      }

      if (!pubkey) {
        this.showError('No pubkey provided. Please login first.');
        return;
      }

      // Let plugins enrich form data before coordination (e.g. hashtag/media auto-extraction).
      // Uses the cross-platform prepareFormData pipeline from core/enrichment.
      const enrichedData = prepareFormData(manifest, this._formData as NostrFormData, (pluginId) =>
        pluginRegistry.get(pluginId)
      );

      // Coordinate events
      const result = coordinateEvents(manifest, enrichedData as NostrFormData, {
        pubkey,
        createdAt: Math.floor(Date.now() / 1000),
        selectedFormatId: this.selectedPublishFormatId || undefined,
        manifestRef: this.manifestRef,
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
        // Show field-level errors
        const newErrors: Record<string, string> = {};
        for (const error of result.error) {
          newErrors[error.field] = error.message;
        }
        this.errors = newErrors;
        return;
      }

      const bundle = applyReplyTargetToBundle(result.data, {
        replyToEventId: this.replyToEventId,
        replyToPubkey: this.replyToPubkey,
        rootEventId: this.rootEventId,
        rootPubkey: this.rootPubkey,
      });

      const parsedExtraTags = parseExtraTags(this.extraTags);
      if (parsedExtraTags.length > 0) {
        for (const event of bundle.events) {
          event.tags.push(...parsedExtraTags);
        }
      }

      if (this.autoPublish) {
        const signedEvents = await this.signAndPublishBundle(bundle);
        this.dispatchCustomEvent<SignedEvent[]>('nostr-post-published', signedEvents);
        this.successMessage = `Published to ${signedEvents.length} event(s)!`;
      } else {
        // Manual mode - just dispatch submit event
        this.dispatchCustomEvent<{ bundle: EventBundle }>('nostr-post-submit', {
          bundle,
        });
        this.successMessage = 'Post created successfully!';
      }

      this._formData = {};
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async signAndPublishBundle(bundle: EventBundle): Promise<SignedEvent[]> {
    const relays = this.relays || (await getUserRelays());
    const signedEvents: SignedEvent[] = [];
    let primaryEventId: string | undefined;

    for (let i = 0; i < bundle.events.length; i++) {
      const unsignedEvent = bundle.events[i];

      // For non-primary events, add `e` tag linking back to the primary event
      if (i > 0 && primaryEventId) {
        unsignedEvent.tags = [...unsignedEvent.tags, ['e', primaryEventId, '', 'root']];
      }

      const { signedEvent, publishResults } = await signAndPublish(unsignedEvent, relays);
      signedEvents.push(signedEvent);

      // First signed event becomes the primary (its ID is now known)
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
  }

  private updateReplyTarget(
    field: 'replyToEventId' | 'replyToPubkey' | 'rootEventId' | 'rootPubkey',
    value: string
  ) {
    this[field] = updateReplyTargetValue(value);
  }

  render() {
    // Use standard Kind 1 manifest if none provided
    const manifest = this.manifest || STANDARD_KIND1_POST_MANIFEST;
    const { metadata } = manifest;
    const selectableFormats = getSelectablePublishFormats(manifest);
    const hiddenErrors = hiddenFieldErrorEntries({
      manifest,
      errors: this.errors,
      excludeFields: this.excludeFields,
      prefill: this.prefill,
    });

    return html`
      <div class="composer">
        ${
          metadata?.name || metadata?.description
            ? html`
              <div class="composer-header">
                ${metadata.name ? html`<h2 class="composer-title">${metadata.name}</h2>` : ''}
                ${
                  metadata.description
                    ? html`<p class="composer-description">
                      ${metadata.description}
                    </p>`
                    : ''
                }
              </div>
            `
            : ''
        }
        ${
          this.successMessage ? html`<div class="success-message">${this.successMessage}</div>` : ''
        }
        ${
          hiddenErrors.length > 0
            ? html`
              <div class="hidden-field-errors" role="alert" aria-live="polite">
                <div class="hidden-field-errors-title">Some hidden fields failed validation:</div>
                <ul>
                  ${hiddenErrors.map(
                    ([fieldId, message]) => html`<li><strong>${fieldId}</strong>: ${message}</li>`
                  )}
                </ul>
              </div>
            `
            : ''
        }

        <form @submit=${this.handleSubmit}>
          ${
            !this.hidePublishFormatSelector && selectableFormats.length > 1
              ? html`
                  <div class="publish-format-panel">
                    <label class="publish-format-label" for="publish-format-select">
                      Publish as
                    </label>
                    <select
                      id="publish-format-select"
                      class="publish-format-select"
                      .value=${this.selectedPublishFormatId}
                      @change=${(e: Event) => {
                        this.selectedPublishFormatId = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      ${selectableFormats.map(
                        (format: PublishFormat) => html`
                          <option value=${format.id}>${format.label}</option>
                        `
                      )}
                    </select>
                    ${
                      selectableFormats.find(
                        (format: PublishFormat) => format.id === this.selectedPublishFormatId
                      )?.description
                        ? html`
                            <p class="publish-format-description">
                              ${
                                selectableFormats.find(
                                  (format: PublishFormat) =>
                                    format.id === this.selectedPublishFormatId
                                )?.description
                              }
                            </p>
                          `
                        : ''
                    }
                  </div>
                `
              : ''
          }
          ${
            !this.showReplyTarget &&
            !this.editableReplyTarget &&
            !hasReplyTarget({
              replyToEventId: this.replyToEventId,
              replyToPubkey: this.replyToPubkey,
              rootEventId: this.rootEventId,
              rootPubkey: this.rootPubkey,
            })
              ? ''
              : renderReplyTargetPanel({
                  target: {
                    replyToEventId: this.replyToEventId,
                    replyToPubkey: this.replyToPubkey,
                    rootEventId: this.rootEventId,
                    rootPubkey: this.rootPubkey,
                  },
                  readonly: !this.editableReplyTarget,
                  onUpdate: (field, value) => this.updateReplyTarget(field, value),
                })
          }
          ${(() => {
            // Build map of fieldId → fields that attach to it (attachTo === fieldId)
            const attachedByTarget = new Map<string, PostField[]>();
            for (const field of manifest.fields) {
              if (!field.attachTo) continue;
              const attached = attachedByTarget.get(field.attachTo) ?? [];
              attached.push(field);
              attachedByTarget.set(field.attachTo, attached);
            }

            return manifest.fields.map((field) => {
              // Attached fields render on target toolbars unless explicitly hidden in composer
              if (field.attachTo && field.visibility?.edit !== 'hidden') {
                return '';
              }
              if (
                isFieldExcluded(field, this.excludeFields) &&
                !isExcludedButPrefilled(field, this.excludeFields, this.prefill)
              ) {
                return '';
              }

              const isHidden =
                isExcludedButPrefilled(field, this.excludeFields, this.prefill) ||
                field.visibility?.edit === 'hidden';

              const ctx: FieldRenderContext = {
                formData: this._formData,
                errors: this.errors,
                expandedFields: this._expandedFields,
                attachedByTarget,
                manifest,
                isReadonly: (f) => isFieldReadonly(f, this.readonlyFields),
                onFieldChange: (id, val) => this.handleFieldChange(id, val),
                onToggleExpanded: (fieldId) => {
                  const next = new Set(this._expandedFields);
                  if (this._expandedFields.has(fieldId)) next.delete(fieldId);
                  else next.add(fieldId);
                  this._expandedFields = next;
                },
              };

              if (!isHidden && (field.metadata as Record<string, unknown>)?.expandable) {
                return renderExpandableField(field, ctx);
              }
              return renderField(field, isHidden, ctx);
            });
          })()}

          <div class="composer-actions">
            <button
              type="submit"
              class="primary"
              ?disabled=${this.isSubmitting || this.isResolvingManifestRef}
            >
              ${
                this.isSubmitting
                  ? 'Creating...'
                  : this.isResolvingManifestRef
                    ? 'Loading Manifest...'
                    : 'Create Post'
              }
            </button>
          </div>
        </form>
      </div>
    `;
  }
}
