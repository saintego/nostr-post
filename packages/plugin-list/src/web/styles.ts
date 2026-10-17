import { css } from 'lit';

/** Styles shared by <np-list-save> and <np-list-view> */
export const listStyles = css`
  :host {
    display: inline-block;
    position: relative;
    font-size: 0.875rem;
    color: #111827;
  }

  button {
    font: inherit;
    cursor: pointer;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    padding: 0.25rem 0.625rem;
  }

  button:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .save-btn[aria-pressed='true'] {
    border-color: #166534;
    color: #166534;
    font-weight: 600;
  }

  .panel {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.25rem);
    left: 0;
    min-width: 16rem;
    padding: 0.5rem;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .list-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    cursor: pointer;
  }

  .count,
  .muted {
    color: #6b7280;
    font-size: 0.8125rem;
  }

  .count {
    margin-left: auto;
  }

  .new-list {
    display: flex;
    gap: 0.375rem;
  }

  .new-list input {
    flex: 1;
    min-width: 0;
    font: inherit;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
  }

  .error {
    color: #b91c1c;
    font-size: 0.8125rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  /* <np-list-view> */
  :host(np-list-view) {
    display: block;
  }

  .list {
    margin-bottom: 1rem;
  }

  .list-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .list-header h3 {
    margin: 0 0 0.375rem;
    font-size: 1rem;
  }

  .list-description {
    margin: 0 0 0.375rem;
    color: #4b5563;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .item-title {
    border: 0;
    background: none;
    padding: 0;
    color: #166534;
    text-align: left;
    flex: 1;
  }

  .danger {
    color: #b91c1c;
    border-color: #fecaca;
  }

  :host-context(.dark) {
    color: #f3f4f6;
  }
  :host-context(.dark) button,
  :host-context(.dark) .panel,
  :host-context(.dark) .new-list input {
    background: #1f2937;
    border-color: #374151;
    color: #f3f4f6;
  }
  :host-context(.dark) .item-title {
    background: none;
    color: #86efac;
  }
  :host-context(.dark) li {
    border-color: #374151;
  }
`;
