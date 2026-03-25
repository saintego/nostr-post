/**
 * @nostr-post/web - <nostr-post-composer> Web Component
 * A universal composer for creating Nostr posts using manifests
 * Supports automatic signing and publishing via NIP-07
 */

import { coordinateEvents } from '@nostr-post/core/coordinator';
import { prepareFormData } from '@nostr-post/core/enrichment';
import { validateManifest } from '@nostr-post/core/manifest';
import {
  type EventBundle,
  type FormData as NostrFormData,
  type NostrPostManifest,
  type PostField,
  STANDARD_KIND1_POST_MANIFEST,
} from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { NostrPostElement, baseStyles } from './base-component';
import { type FieldRenderContext, renderExpandableField, renderField } from './composerField';
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
/**
 * Composer Web Component
 * @fires nostr-post-submit - Fired when form is submitted with event bundle (before signing if autoPublish=false)
 * @fires nostr-post-published - Fired after events are signed and published (if autoPublish=true)
 * @fires nostr-post-error - Fired when validation, signing, or publishing fails
 *
 * @example
 * ```html
 * <!-- Auto-publish mode (recommended) -->
 * <nostr-post-composer auto-publish></nostr-post-composer>
 *
 * <!-- Manual mode (handle signing yourself) -->
 * <nostr-post-composer></nostr-post-composer>
 * <script>
 *   const composer = document.querySelector('nostr-post-composer');
 *   composer.manifest = myManifest;
 *   composer.addEventListener('nostr-post-submit', (e) => {
 *     console.log('Events to sign:', e.detail.bundle);
 *   });
 * </script>
 * ```
 */
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

  constructor() {
    super();
    this._formData = {};
    this.errors = {};
    this.isSubmitting = false;
    this.successMessage = '';
  }

  /**
   * When the manifest or prefill changes, seed _formData with defaults.
   */
  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    const manifestChanged = changed.has('manifest');
    const prefillChanged = changed.has('prefill');
    const manifestRefChanged = changed.has('manifestRef');

    if (manifestChanged || prefillChanged) {
      this.initDefaults({ resetUnknownFields: manifestChanged });
      if (manifestChanged) {
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

  private async _resolveManifestRef() {
    // If an explicit manifest prop is provided, do not override it.
    if (this.manifest) return;
    if (!this.manifestRef) return;

    try {
      const stored = await fetchManifestByATag(this.manifestRef, this.relays);
      if (stored) {
        this.manifest = stored.manifest;
        // initialize defaults for the newly resolved manifest
        this.initDefaults({ resetUnknownFields: true });
        this.errors = {};
        this.successMessage = '';
        this._expandedFields = new Set();
        this.dispatchFormChange();
        void this.ensureManifestPlugins();
      }
    } catch (err) {
      // ignore - it's optional
      // Could emit an event in future to surface errors
      // console.warn('Failed to resolve manifestRef', err);
    }
  }

  private async ensureManifestPlugins() {
    await ensurePluginsForManifest(this.manifest || STANDARD_KIND1_POST_MANIFEST);
    this.requestUpdate();
  }

  private initDefaults({ resetUnknownFields = false }: { resetUnknownFields?: boolean } = {}) {
    const manifest = this.manifest || STANDARD_KIND1_POST_MANIFEST;
    const defaults: Record<string, unknown> = {};
    for (const field of manifest.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      }
    }
    // Prefill overrides field-level defaults
    if (this.prefill) {
      Object.assign(defaults, this.prefill);
    }

    const allowedIds = new Set(manifest.fields.map((field) => field.id));
    const currentFormData = resetUnknownFields
      ? Object.fromEntries(
          Object.entries(this._formData).filter(([fieldId]) => allowedIds.has(fieldId))
        )
      : this._formData;

    // Merge with existing form data (user edits take priority)
    this._formData = { ...defaults, ...currentFormData };
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

  /**
   * Check if a field should be excluded from rendering.
   */
  private isFieldExcluded(field: PostField): boolean {
    if (this.excludeFields?.includes(field.id)) return true;
    if (field.visibility?.edit === 'hidden') return true;
    return false;
  }

  /**
   * Check if a field is excluded but has a prefilled value.
   * These should still be rendered (but hidden) so they can process input events.
   */
  private isExcludedButPrefilled(field: PostField): boolean {
    return (
      this.isFieldExcluded(field) &&
      (this.prefill?.[field.id] !== undefined || field.defaultValue !== undefined)
    );
  }

  /**
   * Check if a field is read-only.
   */
  private isFieldReadonly(field: PostField): boolean {
    if (this.readonlyFields?.includes(field.id)) return true;
    if (field.visibility?.edit === 'readonly') return true;
    return false;
  }

  /**
   * Handle form field changes
   */
  private handleFieldChange(fieldId: string, value: unknown): void {
    const nextFormData = { ...this._formData };
    if (value === undefined) {
      delete nextFormData[fieldId];
    } else {
      nextFormData[fieldId] = value;
    }
    this._formData = nextFormData;
    // Clear field error on change
    if (this.errors[fieldId]) {
      const newErrors = { ...this.errors };
      delete newErrors[fieldId];
      this.errors = newErrors;
    }
    // Dispatch event for external consumers (live event preview)
    this.dispatchFormChange();
  }

  /**
   * Validate and submit the form
   */
  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.successMessage = '';
    this.errors = {};

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

      this._formData = {}; // Reset form
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Sign and publish all events in a bundle, cross-linking secondary events
   * back to the primary event via an `e` tag with "root" marker.
   */
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

        <form @submit=${this.handleSubmit}>
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
              if (this.isFieldExcluded(field) && !this.isExcludedButPrefilled(field)) {
                return '';
              }

              const isHidden =
                this.isExcludedButPrefilled(field) || field.visibility?.edit === 'hidden';

              const ctx: FieldRenderContext = {
                formData: this._formData,
                errors: this.errors,
                expandedFields: this._expandedFields,
                attachedByTarget,
                manifest,
                isReadonly: (f) => this.isFieldReadonly(f),
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
              ?disabled=${this.isSubmitting}
            >
              ${this.isSubmitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    `;
  }
}
