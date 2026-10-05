import { css } from 'lit';

/** Styles of <np-venue-input> */
export const venueInputStyles = css`
  :host {
    display: block;
  }

  .container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Venue search */
  .search-row {
    display: flex;
    gap: 0.5rem;
  }

  .search-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .search-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }

  .btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #f9fafb;
    cursor: pointer;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .btn:hover {
    background: #f3f4f6;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Results */
  .results {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    max-height: 200px;
    overflow-y: auto;
    background: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .result-item {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: 0.8125rem;
    border-bottom: 1px solid #f3f4f6;
    line-height: 1.4;
  }

  .result-item:last-child {
    border-bottom: none;
  }

  .result-item:hover {
    background: #f0f0ff;
  }

  .result-type {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  /* Venue card */
  .venue-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem 0.75rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
  }

  .venue-name {
    font-weight: 600;
    font-size: 0.9375rem;
    color: #166534;
  }

  .venue-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .venue-meta a {
    color: #6366f1;
    text-decoration: none;
  }

  .venue-meta a:hover {
    text-decoration: underline;
  }

  .clear-btn {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 0.8125rem;
    padding: 0;
    text-decoration: underline;
    align-self: flex-start;
  }

  .loading {
    font-size: 0.8125rem;
    color: #6b7280;
    padding: 0.25rem 0;
  }

  .error-message {
    padding: 0.625rem 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #991b1b;
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .resolving {
    padding: 0.625rem 0.75rem;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    color: #1e40af;
    font-size: 0.8125rem;
    line-height: 1.4;
  }
`;
