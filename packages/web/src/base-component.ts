/**
 * @nostr-post/web - Base component utilities
 *
 * Shared functionality for all nostr-post Web Components
 */

import { LitElement, css } from 'lit';

/**
 * Base styles shared across all components
 */
export const baseStyles = css`
  :host {
    display: block;
    font-family: system-ui, -apple-system, sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  .error {
    color: var(--nostr-post-error-color, #dc2626);
    padding: 0.75rem;
    border: 1px solid var(--nostr-post-error-border, #fca5a5);
    background: var(--nostr-post-error-bg, #fef2f2);
    border-radius: 0.375rem;
    margin: 0.5rem 0;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--nostr-post-text-secondary, #6b7280);
  }

  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--nostr-post-text-primary, #111827);
  }

  .field input,
  .field textarea,
  .field select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--nostr-post-input-border, #d1d5db);
    border-radius: 0.375rem;
    font-size: 1rem;
    font-family: inherit;
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus {
    outline: none;
    border-color: var(--nostr-post-primary, #8b5cf6);
    box-shadow: 0 0 0 3px var(--nostr-post-primary-alpha, rgba(139, 92, 246, 0.1));
  }

  .field textarea {
    min-height: 100px;
    resize: vertical;
  }

  .field-error {
    color: var(--nostr-post-error-color, #dc2626);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: var(--nostr-post-primary, #8b5cf6);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover {
    background: var(--nostr-post-primary-hover, #7c3aed);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .required::after {
    content: ' *';
    color: var(--nostr-post-error-color, #dc2626);
  }
`;

/**
 * Base class for all nostr-post Web Components
 */
export class NostrPostElement extends LitElement {
  /**
   * Dispatch a custom event with detail
   */
  protected dispatchCustomEvent<T>(eventName: string, detail: T): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Show error state
   */
  protected showError(message: string): void {
    this.dispatchCustomEvent('nostr-post-error', { message });
  }
}
