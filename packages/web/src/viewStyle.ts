/**
 * @nostr-post/web - Styles for <nostr-post-view>
 */

import { css } from 'lit';

export const viewStyle = css`
  .view {
    padding: 1rem;
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 8px;
    background: var(--nl-card-bg, #f9fafb);
  }

  :host-context(.dark) .view {
    background: #374151;
    border-color: #4b5563;
  }

  .view-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 12px;
  }

  .view-pubkey {
    font-family: monospace;
    color: var(--nl-text-secondary, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .view-timestamp {
    color: var(--nl-text-secondary, #6b7280);
    margin-left: auto;
  }

  .view-content {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    color: var(--nl-text, #1f2937);
  }

  :host-context(.dark) .view-content {
    color: #f3f4f6;
  }

  .view-tags {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--nl-border, #e5e7eb);
  }

  :host-context(.dark) .view-tags {
    border-color: #4b5563;
  }

  .tag {
    display: inline-block;
    padding: 2px 8px;
    margin: 0.25rem 0.25rem 0.25rem 0;
    background: var(--nl-tag-bg, #e5e7eb);
    border-radius: 4px;
    font-size: 12px;
    color: var(--nl-text-secondary, #6b7280);
  }

  :host-context(.dark) .tag {
    background: #4b5563;
    color: #d1d5db;
  }

  .tag-name {
    font-weight: 600;
    margin-right: 0.25rem;
  }

  .view-kind {
    display: inline-block;
    padding: 2px 8px;
    background: var(--nl-primary, #6366f1);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .view-id {
    margin-top: 0.5rem;
    font-size: 11px;
    font-family: monospace;
    color: var(--nl-text-secondary, #9ca3af);
    word-break: break-all;
  }

  .linked-data {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--nl-border, #e5e7eb);
  }

  :host-context(.dark) .linked-data {
    border-color: #4b5563;
  }

  .linked-data-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--nl-text-secondary, #9ca3af);
    margin-bottom: 0.5rem;
  }

  .linked-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    font-size: 0.875rem;
  }

  .linked-field-label {
    font-weight: 500;
    color: var(--nl-text-secondary, #6b7280);
    min-width: 100px;
  }

  :host-context(.dark) .linked-field-label {
    color: #9ca3af;
  }
`;
