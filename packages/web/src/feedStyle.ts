import { css } from 'lit';

export const feedStyle = css`
  .feed {
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .loading,
  .empty {
    text-align: center;
    padding: 2rem;
    color: var(--nl-text-secondary, #6b7280);
  }

  :host-context(.dark) .loading,
  :host-context(.dark) .empty {
    color: #9ca3af;
  }

  .event-item {
    margin-bottom: 0.75rem;
  }

  .event-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .action-button,
  .reaction-button {
    font: inherit;
    cursor: pointer;
  }

  .action-button {
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    border: 1px solid var(--nl-primary, #6366f1);
    background: white;
    color: var(--nl-primary, #6366f1);
  }

  .reaction-button {
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    border: 1px solid var(--nl-border, #d1d5db);
    background: white;
    color: var(--nl-text, #1f2937);
  }

  .reaction-summary,
  .reply-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .reaction-summary {
    margin: 0.5rem 0 0.75rem;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .reaction-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: var(--nl-tag-bg, #e5e7eb);
    color: var(--nl-text-secondary, #6b7280);
    font-size: 0.75rem;
  }

  .reaction-authors {
    margin-left: 0.15rem;
    font-size: 0.7rem;
    opacity: 0.9;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reply-list {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--nl-border, #e5e7eb);
  }

  .reply-header {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--nl-text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .reply-composer {
    margin-top: 0.75rem;
  }

  .status {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .status.info {
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .status.error {
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }
`;
