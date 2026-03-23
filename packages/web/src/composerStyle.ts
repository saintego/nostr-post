import { css } from 'lit';

export const composerStyle = css`
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

  .reply-target-panel {
    margin-bottom: 1rem;
    padding: 0.75rem;
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 8px;
    background: #f9fafb;
  }

  .reply-target-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--nl-text, #111827);
    margin-bottom: 0.5rem;
  }

  .reply-target-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .reply-target-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--nl-text-secondary, #6b7280);
  }

  .reply-target-field input[readonly] {
    background: #f3f4f6;
    color: #6b7280;
  }

  :host-context(.dark) .reply-target-panel {
    background: #1f2937;
    border-color: #4b5563;
  }

  :host-context(.dark) .reply-target-title {
    color: #f3f4f6;
  }

  :host-context(.dark) .reply-target-field {
    color: #d1d5db;
  }

  @media (max-width: 640px) {
    .reply-target-grid {
      grid-template-columns: 1fr;
    }
  }

  .success-message {
    padding: 0.75rem;
    background: #d1fae5;
    border: 1px solid #6ee7b7;
    border-radius: 8px;
    color: #065f46;
    margin-bottom: 1rem;
  }

  .field-readonly {
    opacity: 0.75;
    pointer-events: none;
  }

  .readonly-value {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .expandable-field {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .expand-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 0.8rem;
    color: var(--nl-text-secondary, #6b7280);
    transition: border-color 0.15s, color 0.15s;
  }

  .expand-toggle:hover {
    border-color: var(--nl-primary, #6366f1);
    color: var(--nl-primary, #6366f1);
  }

  .expand-toggle.expanded {
    border-color: var(--nl-primary, #6366f1);
    color: var(--nl-primary, #6366f1);
    background: rgba(99, 102, 241, 0.05);
  }

  .expand-chevron {
    font-size: 0.65rem;
    opacity: 0.7;
  }

  .upload-status {
    font-size: 0.8rem;
    color: var(--nl-text-secondary, #6b7280);
    padding: 0.25rem 0;
    animation: pulse 1s infinite alternate;
  }

  @keyframes pulse {
    from { opacity: 1; }
    to { opacity: 0.5; }
  }

  :host-context(.dark) .expand-toggle {
    border-color: #4b5563;
    color: #9ca3af;
  }

  :host-context(.dark) .expand-toggle.expanded {
    background: rgba(99, 102, 241, 0.1);
  }

  :host-context(.dark) .success-message {
    background: #064e3b;
    border-color: #059669;
    color: #6ee7b7;
  }
`;
