/**
 * @nostr-post/web - Base component utilities
 *
 * Shared functionality for all nostr-post Web Components
 */

import { LitElement } from 'lit';

// Re-export theme
export { colors, baseStyles } from './theme';

/**
 * Base class for all nostr-post Web Components
 */
export class NostrPostElement extends LitElement {
  /**
   * Dispatch a custom event with detail
   */
  protected dispatchCustomEvent<T>(eventName: string, detail: T): void {
    // Dispatch the full event name
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
