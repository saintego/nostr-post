import { css } from 'lit';

export const profileStyles = css`
  :host {
    display: block;
    font-size: 0.875rem;
  }

  .people {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .person {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .avatar {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    object-fit: cover;
    background: #e5e7eb;
    flex: none;
  }

  .name {
    font-weight: 500;
    color: #1f2937;
  }

  .role {
    color: #6b7280;
  }

  input {
    font: inherit;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: #ffffff;
    color: #1f2937;
  }

  .role-input {
    width: 9rem;
  }

  .search {
    position: relative;
    margin-top: 0.375rem;
  }

  .search input {
    width: 100%;
    box-sizing: border-box;
  }

  .results {
    position: absolute;
    z-index: 10;
    left: 0;
    right: 0;
    top: calc(100% + 0.25rem);
    max-height: 16rem;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .result {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    background: none;
    font: inherit;
    text-align: left;
    cursor: pointer;
    color: #1f2937;
  }

  .result:hover,
  .result:focus {
    background: #f3f4f6;
  }

  .nip05 {
    color: #6b7280;
    font-size: 0.8125rem;
  }

  .note {
    padding: 0.375rem 0.5rem;
    color: #6b7280;
  }

  .remove {
    border: none;
    background: none;
    cursor: pointer;
    color: #6b7280;
    font-size: 1rem;
    line-height: 1;
  }

  :host-context(.dark) .name,
  :host-context(.dark) .result {
    color: #f3f4f6;
  }

  :host-context(.dark) .role,
  :host-context(.dark) .nip05,
  :host-context(.dark) .note,
  :host-context(.dark) .remove {
    color: #9ca3af;
  }

  :host-context(.dark) input {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) .results {
    background: #1f2937;
    border-color: #4b5563;
  }

  :host-context(.dark) .result:hover,
  :host-context(.dark) .result:focus {
    background: #374151;
  }

  :host-context(.dark) .avatar {
    background: #4b5563;
  }
`;
