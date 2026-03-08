import { css } from 'lit';

export const listInputStyles = css`
  :host {
    display: block;
  }

  .container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Selection row */
  .selection-row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }

  select {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.15s;
  }

  select:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }

  :host-context(.dark) select {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) select:focus {
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
  }

  .btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #f9fafb;
    cursor: pointer;
    font-size: 0.875rem;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .btn:hover {
    background: #f3f4f6;
  }

  :host-context(.dark) .btn {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) .btn:hover {
    background: #4b5563;
  }

  .btn:active {
    background: #e5e7eb;
  }

  .btn-danger {
    color: #ef4444;
    border-color: #fecaca;
  }

  .btn-danger:hover {
    background: #fef2f2;
  }

  :host-context(.dark) .btn-danger {
    color: #fca5a5;
    border-color: #7f1d1d;
  }

  :host-context(.dark) .btn-danger:hover {
    background: #450a0a;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* List info card */
  .list-info {
    padding: 0.75rem;
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .list-name {
    font-weight: 600;
    color: #0c4a6e;
    margin-bottom: 0.25rem;
  }

  .list-description {
    color: #64748b;
    margin-bottom: 0.5rem;
  }

  .list-stats {
    color: #475569;
    font-size: 0.75rem;
  }

  :host-context(.dark) .list-info {
    background: #1e293b;
    border-color: #334155;
  }

  :host-context(.dark) .list-name {
    color: #bfdbfe;
  }

  :host-context(.dark) .list-description {
    color: #cbd5e1;
  }

  :host-context(.dark) .list-stats {
    color: #94a3b8;
  }

  /* Create list dialog */
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  :host-context(.dark) .dialog-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .dialog {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }

  :host-context(.dark) .dialog {
    background: #1f2937;
    color: #f3f4f6;
    border: 1px solid #374151;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
  }

  .dialog-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .dialog-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .dialog-field label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .dialog-field input,
  .dialog-field textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .dialog-field input:focus,
  .dialog-field textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }

  :host-context(.dark) .dialog-field label {
    color: #e5e7eb;
  }

  :host-context(.dark) .dialog-field input,
  :host-context(.dark) .dialog-field textarea {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) .dialog-field input::placeholder,
  :host-context(.dark) .dialog-field textarea::placeholder {
    color: #9ca3af;
  }

  :host-context(.dark) .dialog-field input:focus,
  :host-context(.dark) .dialog-field textarea:focus {
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
  }

  .dialog-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .dialog-actions button {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    background: #f9fafb;
  }

  .dialog-actions button:hover {
    background: #f3f4f6;
  }

  :host-context(.dark) .dialog-actions button {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) .dialog-actions button:hover {
    background: #4b5563;
  }

  .dialog-actions button.primary {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
  }

  .dialog-actions button.primary:hover {
    background: #4f46e5;
  }

  /* Loading & error states */
  .loading {
    color: #6b7280;
    font-size: 0.8125rem;
    padding: 0.5rem 0;
  }

  :host-context(.dark) .loading {
    color: #9ca3af;
  }

  .error {
    color: #dc2626;
    background: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }

  :host-context(.dark) .error {
    color: #fca5a5;
    background: #450a0a;
    border-color: #7f1d1d;
  }
`;
