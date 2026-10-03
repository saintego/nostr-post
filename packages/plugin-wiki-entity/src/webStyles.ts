import { css } from 'lit';

/** Styles of <wiki-entity-picker> */
export const pickerStyles = css`
  :host {
    display: block;
    font-family: inherit;
  }

  /* ── Selected chip ── */
  .selected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    background: color-mix(in srgb, var(--nl-primary, #6366f1) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--nl-primary, #6366f1) 30%, transparent);
    border-radius: 0.375rem;
  }
  .selected-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--nl-text, #111827);
    flex: 1;
  }
  .selected-pubkey {
    font-size: 0.7rem;
    color: var(--nl-text-secondary, #6b7280);
    font-family: monospace;
  }
  .clear-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--nl-text-secondary, #6b7280);
    font-size: 1.1rem;
    padding: 0 0.15rem;
    line-height: 1;
    border-radius: 0.25rem;
  }
  .clear-btn:hover { color: #ef4444; }

  /* ── Picker wrapper ── */
  .picker { position: relative; }

  .search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: var(--nl-text, #111827);
    background: var(--nl-bg, white);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-input:focus {
    border-color: var(--nl-primary, #6366f1);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--nl-primary, #6366f1) 15%, transparent);
  }

  /* ── Dropdown ── */
  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--nl-bg, white);
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 0.5rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 100;
    overflow: hidden;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    cursor: pointer;
    border-bottom: 1px solid var(--nl-border, #e5e7eb);
    transition: background 0.1s;
    outline: none;
  }
  .result-item:last-of-type { border-bottom: none; }
  .result-item:hover,
  .result-item:focus {
    background: color-mix(in srgb, var(--nl-primary, #6366f1) 8%, transparent);
  }
  .result-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--nl-text, #111827);
    flex: 1;
  }
  .result-pubkey {
    font-size: 0.7rem;
    color: var(--nl-text-secondary, #6b7280);
    font-family: monospace;
  }
  .result-arrow {
    font-size: 0.75rem;
    color: var(--nl-text-secondary, #6b7280);
  }

  .status-row {
    padding: 0.625rem 0.875rem;
    font-size: 0.8rem;
    color: var(--nl-text-secondary, #6b7280);
  }

  .create-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: none;
    border: none;
    border-top: 1px solid var(--nl-border, #e5e7eb);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--nl-primary, #6366f1);
    text-align: left;
    transition: background 0.1s;
  }
  .create-dtag {
    margin-left: auto;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--nl-text-secondary, #6b7280);
  }
  .create-btn:hover {
    background: color-mix(in srgb, var(--nl-primary, #6366f1) 8%, transparent);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(17, 24, 39, 0.5);
  }
  .modal {
    width: min(640px, 100%);
    max-height: calc(100vh - 2rem);
    overflow: auto;
    border-radius: 10px;
    background: var(--nl-bg, white);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--nl-border, #e5e7eb);
    font-weight: 600;
  }
  .modal-body {
    padding: 1rem;
  }

  :host-context(.dark) .modal {
    background: #1f2937;
    color: #f9fafb;
  }
  :host-context(.dark) .search-input,
  :host-context(.dark) .dropdown {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
  :host-context(.dark) .result-item:hover,
  :host-context(.dark) .result-item:focus {
    background: rgba(99, 102, 241, 0.15);
  }
  :host-context(.dark) .selected {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.4);
  }
`;
