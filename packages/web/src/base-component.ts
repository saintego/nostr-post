/**
 * @nostr-post/web - Base component utilities
 *
 * Shared functionality for all nostr-post Web Components
 * Styling matches nostr-login for unified look and feel
 */

import { LitElement, css } from "lit";

/**
 * Base styles shared across all components
 * Designed to match nostr-login's design system
 */
export const baseStyles = css`
  :host {
    display: block;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  * {
    box-sizing: border-box;
  }

  /* Match nostr-login error styling */
  .error {
    color: var(--nl-error, #dc2626);
    padding: 0.75rem;
    border: 1px solid var(--nl-error-border, #fca5a5);
    background: var(--nl-error-bg, #fef2f2);
    border-radius: 8px;
    margin: 0.5rem 0;
    font-size: 14px;
  }

  :host-context(.dark) .error {
    background: #450a0a;
    border-color: #dc2626;
    color: #fca5a5;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--nl-text-secondary, #6b7280);
  }

  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--nl-text, #1f2937);
    font-size: 14px;
  }

  :host-context(.dark) .field label {
    color: #f3f4f6;
  }

  /* Match nostr-login input styling */
  .field input,
  .field textarea,
  .field select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--nl-border, #d1d5db);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: var(--nl-input-bg, #f9fafb);
    color: var(--nl-text, #1f2937);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  :host-context(.dark) .field input,
  :host-context(.dark) .field textarea,
  :host-context(.dark) .field select {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus {
    outline: none;
    border-color: var(--nl-primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  :host-context(.dark) .field input:focus,
  :host-context(.dark) .field textarea:focus,
  :host-context(.dark) .field select:focus {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  .field textarea {
    min-height: 100px;
    resize: vertical;
  }

  .field-error {
    color: var(--nl-error, #dc2626);
    font-size: 12px;
    margin-top: 0.25rem;
  }

  /* Match nostr-login button styling */
  button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--nl-button-bg, white);
    color: var(--nl-button-text, #1f2937);
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  button:hover {
    background: var(--nl-button-hover, #f9fafb);
  }

  :host-context(.dark) button {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) button:hover {
    background: #4b5563;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Primary button style */
  button.primary {
    background: var(--nl-primary, #6366f1);
    color: white;
    border-color: var(--nl-primary, #6366f1);
  }

  button.primary:hover {
    background: var(--nl-primary-hover, #4f46e5);
    border-color: var(--nl-primary-hover, #4f46e5);
  }

  :host-context(.dark) button.primary {
    background: #4f46e5;
    border-color: #4f46e5;
  }

  :host-context(.dark) button.primary:hover {
    background: #4338ca;
    border-color: #4338ca;
  }

  .required::after {
    content: " *";
    color: var(--nl-error, #dc2626);
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
    this.dispatchCustomEvent("nostr-post-error", { message });
  }
}
