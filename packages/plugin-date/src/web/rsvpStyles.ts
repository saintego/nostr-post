import { css } from 'lit';

export const rsvpStyles = css`
  :host {
    display: inline-block;
  }

  .rsvp {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
  }

  button {
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0.125rem 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    background: #ffffff;
    color: #1f2937;
  }

  button.chosen {
    background: #6366f1;
    border-color: #6366f1;
    color: #ffffff;
  }

  button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .count {
    margin-left: 0.125rem;
    color: #6b7280;
  }

  button.chosen .count {
    color: #e0e7ff;
  }

  .note {
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .error {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    color: #dc2626;
  }

  :host-context(.dark) button {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) button.chosen {
    background: #4f46e5;
    border-color: #4f46e5;
  }

  :host-context(.dark) .count,
  :host-context(.dark) .note {
    color: #9ca3af;
  }

  :host-context(.dark) .error {
    color: #fca5a5;
  }
`;
