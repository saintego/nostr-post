import { css } from 'lit';

/** Styles of <nostr-wiki-composer> */
export const composerStyles = css`
  :host {
    display: block;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  * { box-sizing: border-box; }

  form.nostr-wiki-composer {
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 8px;
    background: var(--nl-bg, white);
    overflow: hidden;
  }

  /* ── Header ── */
  .wiki-composer-header {
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--nl-border, #e5e7eb);
    background: var(--nl-card-bg, #f9fafb);
  }
  .wiki-composer-header h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.125rem 0;
    color: var(--nl-text, #111827);
  }
  .wiki-composer-header small {
    font-size: 0.75rem;
    color: var(--nl-text-secondary, #6b7280);
  }

  /* ── Fields ── */
  .wiki-fields {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .wiki-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--nl-text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  input[type="text"],
  input[type="number"],
  select,
  textarea {
    width: 100%;
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--nl-border, #d1d5db);
    border-radius: 6px;
    font-size: 0.875rem;
    color: var(--nl-text, #111827);
    background: var(--nl-input-bg, #f9fafb);
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  input[type="text"]:focus,
  input[type="number"]:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--nl-primary, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }

  textarea {
    min-height: 90px;
    resize: vertical;
    line-height: 1.55;
  }

  select { cursor: pointer; }

  /* ── Plugin web components ── */
  .wiki-field > [id^="field-"] { width: 100%; }

  /* ── Error ── */
  .wiki-error {
    margin: 0 1.25rem 0.75rem;
    padding: 0.5rem 0.75rem;
    color: #dc2626;
    font-size: 0.8rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
  }

  /* ── Actions ── */
  .wiki-composer-actions {
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--nl-border, #e5e7eb);
    background: var(--nl-card-bg, #f9fafb);
    display: flex;
    justify-content: flex-end;
  }

  button[type="submit"] {
    padding: 0.45rem 1.25rem;
    background: var(--nl-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  button[type="submit"]:hover:not(:disabled) { background: var(--nl-primary-hover, #4f46e5); }
  button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── State messages ── */
  p {
    padding: 1.5rem;
    text-align: center;
    color: var(--nl-text-secondary, #6b7280);
    margin: 0;
  }

  /* ── Identity preview ── */
  .wiki-identity-preview {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--nl-info-bg, #eff6ff);
    border: 1px solid var(--nl-info-border, #bfdbfe);
    border-radius: 6px;
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .preview-label { color: var(--nl-text-secondary, #6b7280); margin-right: 0.3rem; }
  .preview-value { font-weight: 500; }
  .preview-dtag  { font-family: monospace; color: var(--nl-accent, #2563eb); }

  /* ── Dark mode ── */
  :host-context(.dark) form.nostr-wiki-composer { background: #1f2937; border-color: #374151; }
  :host-context(.dark) .wiki-composer-header,
  :host-context(.dark) .wiki-composer-actions  { background: #111827; border-color: #374151; }
  :host-context(.dark) .wiki-composer-header h3 { color: #f3f4f6; }
  :host-context(.dark) input[type="text"],
  :host-context(.dark) input[type="number"],
  :host-context(.dark) select,
  :host-context(.dark) textarea {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  .wiki-disambiguation {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid #fcd34d;
    border-radius: 0.375rem;
    background: #fffbeb;
    font-size: 0.85rem;
    color: #92400e;
  }
  .wiki-disambiguation p {
    margin: 0 0 0.5rem;
  }
  .wiki-disambiguation label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-weight: 500;
  }
  .wiki-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
  }
  .wiki-suggestions button {
    padding: 0.2rem 0.6rem;
    border: 1px solid #fcd34d;
    border-radius: 999px;
    background: white;
    color: #92400e;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .wiki-dtag-status {
    margin: 0 0 0.75rem;
    font-size: 0.8rem;
    color: var(--nl-text-secondary, #6b7280);
  }
`;
