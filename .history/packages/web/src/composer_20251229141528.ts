/**
 * @nostr-post/web - <nostr-post-composer> Web Component
 *
 * A universal composer for creating Nostr posts using manifests
 */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { coordinateEvents } from '@nostr-post/core/coordinator';
import { validateManifest } from '@nostr-post/core/manifest';
import type {
  EventBundle,
  FormData as NostrFormData,
  NostrPostManifest,
  PostField,
  ValidationError,
} from '@nostr-post/core/types';
import { NostrPostElement, baseStyles } from './base-component';

/**
 * Composer Web Component
 *
 * @fires nostr-post-submit - Fired when form is submitted with event bundle
 * @fires nostr-post-error - Fired when validation or coordination fails
 *
 * @example
 * ```html
 * <nostr-post-composer></nostr-post-composer>
 * <script>
 *   const composer = document.querySelector('nostr-post-composer');
 *   composer.manifest = myManifest;
 *   composer.addEventListener('nostr-post-submit', (e) => {
 *     console.log('Events:', e.detail.bundle);
 *   });
 * </script>
 * ```
 */
@customElement('nostr-post-composer')
export class NostrPostComposer extends NostrPostElement {
  static styles = [
    baseStyles,
    css`
      :host {
        --nostr-post-primary: #8b5cf6;
        --nostr-post-primary-hover: #7c3aed;
      }

      .composer {
        padding: 1rem;
        border: 1px solid var(--nostr-post-border, #e5e7eb);
        border-radius: 0.5rem;
        background: var(--nostr-post-bg, white);
      }

      .composer-header {
        margin-bottom: 1.5rem;
      }

      .composer-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: var(--nostr-post-text-primary, #111827);
      }

      .composer-description {
        color: var(--nostr-post-text-secondary, #6b7280);
        margin: 0;
      }

      .composer-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1.5rem;
      }

      .success-message {
        padding: 0.75rem;
        background: var(--nostr-post-success-bg, #d1fae5);
        border: 1px solid var(--nostr-post-success-border, #6ee7b7);
        border-radius: 0.375rem;
        color: var(--nostr-post-success-color, #065f46);
        margin-bottom: 1rem;
      }
    `,
  ];

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ type: String })
  pubkey = '';

  @state()
  private formData: Record<string, unknown> = {};

  @state()
  private errors: Record<string, string> = {};

  @state()
  private isSubmitting = false;

  @state()
  private successMessage = '';

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

    if (!this.manifest) {
      this.showError('No manifest provided');
      return;
    }

    // Validate manifest
    const manifestValidation = validateManifest(this.manifest);
    if (!manifestValidation.success) {
      const errorMessages = manifestValidation.error
        .map((err) => `${err.field}: ${err.message}`)
        .join(', ');
      this.showError(`Invalid manifest: ${errorMessages}`);
      return;
    }

    this.isSubmitting = true;

    try {
      // Coordinate events
      const result = coordinateEvents(this.manifest, this.formData as NostrFormData, {
        pubkey: this.pubkey,
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

      // Success! Dispatch event with bundle
      this.dispatchCustomEvent<{ bundle: EventBundle }>('nostr-post-submit', {
        bundle: result.data,
      });

      this.successMessage = 'Post created successfully!';
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
        ${this.renderFieldInput(field, value, handleInput)} ${error ? html`<div class="field-error">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render the appropriate input element for a field
   */
  private renderFieldInput(
    field: PostField,
    value: unknown,
    handleInput: (e: Event) => void
  ) {
    switch (field.type) {
      case 'string':
        if (field.uiPlugin === 'textarea' || field.uiPlugin === 'markdown') {
          return html`<textarea @input=${handleInput} .value=${String(value)}></textarea>`;
        }
        return html`<input type="text" @input=${handleInput} .value=${String(value)} />`;

      case 'number':
        return html`<input type="number" @input=${handleInput} .value=${String(value)} />`;

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
              (opt) => html`<option value=${opt} ?selected=${value === opt}>${opt}</option>`
            )}
          </select>
        `;

      default:
        return html`<input type="text" @input=${handleInput} .value=${String(value)} />`;
    }
  }

  render() {
    if (!this.manifest) {
      return html`<div class="error">No manifest provided. Please set the manifest property.</div>`;
    }

    const { metadata } = this.manifest;

    return html`
      <div class="composer">
        ${metadata?.name || metadata?.description
          ? html`
              <div class="composer-header">
                ${metadata.name ? html`<h2 class="composer-title">${metadata.name}</h2>` : ''}
                ${metadata.description
                  ? html`<p class="composer-description">${metadata.description}</p>`
                  : ''}
              </div>
            `
          : ''}
        ${this.successMessage ? html`<div class="success-message">${this.successMessage}</div>` : ''}

        <form @submit=${this.handleSubmit}>
          ${this.manifest.fields.map((field) => this.renderField(field))}

          <div class="composer-actions">
            <button type="submit" ?disabled=${this.isSubmitting}>
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
