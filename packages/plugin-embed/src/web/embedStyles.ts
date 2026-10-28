import { css } from 'lit';

export const embedStyles = css`
  :host {
    display: block;
  }

  .embeds {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .frame {
    width: 100%;
    border: 0;
    border-radius: 8px;
    display: block;
  }

  .video {
    aspect-ratio: 16 / 9;
    max-width: 40rem;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    width: 100%;
    border: 1px dashed #d1d5db;
    border-radius: 8px;
    background: #f9fafb;
    color: #1f2937;
    font: inherit;
    cursor: pointer;
  }

  .placeholder .note {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .link {
    color: #4f46e5;
    word-break: break-all;
  }

  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  input {
    flex: 1;
    font: inherit;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: #ffffff;
    color: #1f2937;
  }

  button.small {
    font: inherit;
    font-size: 0.8125rem;
    background: none;
    border: none;
    color: #6366f1;
    cursor: pointer;
    padding: 0.25rem 0;
  }

  .hint {
    margin: 0;
    font-size: 0.75rem;
    color: #6b7280;
  }

  :host-context(.dark) .hint {
    color: #9ca3af;
  }

  :host-context(.dark) .placeholder {
    background: #1f2937;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) .placeholder .note {
    color: #9ca3af;
  }

  :host-context(.dark) .link,
  :host-context(.dark) button.small {
    color: #a5b4fc;
  }

  :host-context(.dark) input {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }
`;
