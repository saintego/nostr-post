/**
 * @nostr-post/web - <nostr-post-composer> Web Component
 *
 * A universal composer for creating Nostr posts using manifests
 * Supports automatic signing and publishing via NIP-07
 */

import { coordinateEvents } from '@nostr-post/core/coordinator';
import { validateManifest } from '@nostr-post/core/manifest';
import {
  DEFAULT_KIND1_MANIFEST,
  type EventBundle,
  type FormData as NostrFormData,
  type NostrPostManifest,
  type PostField,
} from '@nostr-post/core/types';
import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { NostrPostElement, baseStyles } from './base-component';
import { type SignedEvent, getPublicKey, getUserRelays, signAndPublish } from './signer';

/**
 * Composer Web Component
 *
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
  static styles = [
    baseStyles,
    css`
      .composer {
        padding: 1rem;
        border: 1px solid var(--nl-border, #e5e7eb);
        border-radius: 8px;
        background: var(--nl-bg, white);
      }

      :host-context(.dark) .composer {
        background: #374151;
        border-color: #4b5563;
      }

      .composer-header {
        margin-bottom: 1rem;
      }

      .composer-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
        color: var(--nl-text, #111827);
      }

      :host-context(.dark) .composer-title {
        color: #f3f4f6;
      }

      .composer-description {
        color: var(--nl-text-secondary, #6b7280);
        margin: 0;
      }

      .composer-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .success-message {
        padding: 0.75rem;
        background: #d1fae5;
        border: 1px solid #6ee7b7;
        border-radius: 8px;
        color: #065f46;
        margin-bottom: 1rem;
      }

      :host-context(.dark) .success-message {
        background: #064e3b;
        border-color: #059669;
        color: #6ee7b7;
      }
    `,
  ];

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ type: String })
  pubkey?: string;

  /** Auto-sign and publish events (uses NIP-07 window.nostr) */
  @property({ type: Boolean, attribute: 'auto-publish' })
  autoPublish = false;

  /** Custom relay URLs (defaults to popular relays) */
  @property({ type: Array })
  relays?: string[];

  @state()
  private formData!: Record<string, unknown>;

  @state()
  private errors!: Record<string, string>;

  @state()
  private isSubmitting!: boolean;

  @state()
  private successMessage!: string;

  constructor() {
    super();
    this.formData = {};
    this.errors = {};
    this.isSubmitting = false;
    this.successMessage = '';
  }

  /**
   * Handle form field changes
   */
  private handleFieldChange(fieldId: string, value: unknown): void {
    this.formData = {
      ...this.formData,
      [fieldId]: value,
    };
    // Clear field error on change
    if (this.errors[fieldId]) {
      const newErrors = { ...this.errors };
      delete newErrors[fieldId];
      this.errors = newErrors;
    }
  }

  /**
   * Validate and submit the form
   */
  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.successMessage = '';
    this.errors = {};

    // Use default Kind 1 manifest if none provided
    const manifest = this.manifest || DEFAULT_KIND1_MANIFEST;

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

      // Coordinate events
      const result = coordinateEvents(manifest, this.formData as NostrFormData, {
        pubkey,
        createdAt: Math.floor(Date.now() / 1000),
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

      const bundle = result.data;

      if (this.autoPublish) {
        // Auto-sign and publish
        const relays = this.relays || (await getUserRelays());
        const signedEvents: SignedEvent[] = [];

        for (const unsignedEvent of bundle.events) {
          const { signedEvent, publishResults } = await signAndPublish(unsignedEvent, relays);
          signedEvents.push(signedEvent);

          if (publishResults.success === 0) {
            throw new Error(
              `Failed to publish to any relay: ${publishResults.results
                .map((r) => r.error)
                .join(', ')}`
            );
          }
        }

        // Dispatch published event
        this.dispatchCustomEvent<{
          events: SignedEvent[];
          bundle: EventBundle;
        }>('nostr-post-published', {
          events: signedEvents,
          bundle,
        });

        this.successMessage = `Published to ${signedEvents.length} event(s)!`;
      } else {
        // Manual mode - just dispatch submit event
        this.dispatchCustomEvent<{ bundle: EventBundle }>('nostr-post-submit', {
          bundle,
        });
        this.successMessage = 'Post created successfully!';
      }

      this.formData = {}; // Reset form
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Render a single form field based on its type
   */
  private renderField(field: PostField) {
    const value = this.formData[field.id] ?? '';
    const error = this.errors[field.id];
    const isRequired = field.required === true;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      let fieldValue: unknown = target.value;

      // Type conversion
      if (field.type === 'number') {
        fieldValue = Number.parseFloat(target.value);
      } else if (field.type === 'boolean') {
        fieldValue = (target as HTMLInputElement).checked;
      }

      this.handleFieldChange(field.id, fieldValue);
    };

    return html`
      <div class="field">
        <label class="${isRequired ? 'required' : ''}">${field.id}</label>
        ${this.renderFieldInput(field, value, handleInput)}
        ${error ? html`<div class="field-error">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render the appropriate input element for a field
   */
  private renderFieldInput(field: PostField, value: unknown, handleInput: (e: Event) => void) {
    switch (field.type) {
      case 'string':
        if (field.uiPlugin === 'textarea' || field.uiPlugin === 'markdown') {
          return html`<textarea
            @input=${handleInput}
            .value=${String(value)}
          ></textarea>`;
        }
        return html`<input
          type="text"
          @input=${handleInput}
          .value=${String(value)}
        />`;

      case 'number':
        return html`<input
          type="number"
          @input=${handleInput}
          .value=${String(value)}
        />`;

      case 'boolean':
        return html`<input
          type="checkbox"
          @change=${handleInput}
          .checked=${Boolean(value)}
        />`;

      case 'enum':
        return html`
          <select @change=${handleInput}>
            <option value="">Select...</option>
            ${field.options?.map(
              (opt) =>
                html`<option value=${opt} ?selected=${value === opt}>
                  ${opt}
                </option>`
            )}
          </select>
        `;

      default:
        return html`<input
          type="text"
          @input=${handleInput}
          .value=${String(value)}
        />`;
    }
  }

  render() {
    // Use default Kind 1 manifest if none provided
    const manifest = this.manifest || DEFAULT_KIND1_MANIFEST;
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
          ${manifest.fields.map((field) => this.renderField(field))}

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

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-composer': NostrPostComposer;
  }
}
