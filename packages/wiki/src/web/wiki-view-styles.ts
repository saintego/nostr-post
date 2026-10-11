import { css } from 'lit';

/** Styles of <nostr-wiki-view> */
export const viewStyles = css`
  :host {
    display: block;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  * { box-sizing: border-box; }

  .wiki-view {
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 8px;
    background: var(--nl-bg, white);
    overflow: hidden;
  }

  /* ── Header ── */
  .wiki-header {
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--nl-border, #e5e7eb);
    background: var(--nl-card-bg, #f9fafb);
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    flex-wrap: wrap;
  }
  .wiki-header h2 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0;
    color: var(--nl-text, #111827);
    flex: 1;
  }
  .wiki-badge {
    font-size: 0.7rem;
    color: var(--nl-text-secondary, #9ca3af);
    white-space: nowrap;
  }

  /* ── Infobox table ── */
  dl.wiki-infobox {
    display: grid;
    grid-template-columns: minmax(80px, auto) 1fr;
    margin: 0;
    padding: 0;
    border-bottom: 1px solid var(--nl-border, #e5e7eb);
  }
  .wiki-field { display: contents; }

  .wiki-field dt,
  .wiki-field dd {
    padding: 0.45rem 1rem;
    border-bottom: 1px solid var(--nl-border, #f3f4f6);
    margin: 0;
  }
  .wiki-field:last-child dt,
  .wiki-field:last-child dd { border-bottom: none; }


  .wiki-field dt[title] { cursor: help; text-decoration: underline dotted; }

  .wiki-field dt {
    font-size: 0.69rem;
    font-weight: 600;
    color: var(--nl-text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--nl-card-bg, #f9fafb);
    display: flex;
    align-items: center;
  }
  .wiki-field dd {
    color: var(--nl-text, #111827);
    font-size: 0.875rem;
    display: flex;
    align-items: center;
  }

  /* ── Prose ── */
  .wiki-prose {
    padding: 0.875rem 1.25rem;
    color: var(--nl-text, #374151);
    line-height: 1.7;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ── Contributors ── */
  details.wiki-contributors { border-top: 1px solid var(--nl-border, #e5e7eb); }
  details.wiki-contributors summary {
    padding: 0.5rem 1.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--nl-primary, #6366f1);
    font-weight: 500;
    user-select: none;
  }
  .wiki-contributor {
    display: flex;
    justify-content: space-between;
    padding: 0.2rem 1.25rem;
    font-size: 0.72rem;
    color: var(--nl-text-secondary, #6b7280);
    font-family: monospace;
  }

  /* ── State messages ── */
  p {
    padding: 1.5rem;
    text-align: center;
    color: var(--nl-text-secondary, #6b7280);
    margin: 0;
  }

  /* ── Dark mode ── */
  :host-context(.dark) .wiki-view   { background: #1f2937; border-color: #374151; }
  :host-context(.dark) .wiki-header,
  :host-context(.dark) .wiki-field dt { background: #111827; border-color: #374151; }
  :host-context(.dark) .wiki-header h2,
  :host-context(.dark) .wiki-field dd  { color: #f3f4f6; }
  :host-context(.dark) .wiki-field dt,
  :host-context(.dark) .wiki-badge     { color: #9ca3af; }
  :host-context(.dark) .wiki-field dd  { border-color: #374151; }
  :host-context(.dark) .wiki-prose     { color: #d1d5db; }
  :host-context(.dark) dl.wiki-infobox { border-color: #374151; }
  .wiki-sources {
    padding: 0.4rem 1.25rem;
    border-top: 1px solid var(--nl-border, #e5e7eb);
    font-size: 0.7rem;
    color: var(--nl-text-secondary, #6b7280);
  }
  .wiki-sources a { color: inherit; }
  .wiki-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.5rem 1.25rem;
    border-top: 1px solid var(--nl-border, #e5e7eb);
    font-size: 0.8rem;
  }
  .wiki-links-label {
    font-weight: 600;
    color: var(--nl-text-secondary, #6b7280);
  }
  .wiki-links a { color: var(--nl-primary, #6366f1); }
  details.wiki-all-data {
    border-top: 1px solid var(--nl-border, #e5e7eb);
    padding: 0.5rem 1.25rem;
    font-size: 0.75rem;
  }
  details.wiki-all-data summary {
    cursor: pointer;
    color: var(--nl-text-secondary, #6b7280);
    font-weight: 500;
  }
  details.wiki-all-data h4 { margin: 0.6rem 0 0.25rem; font-size: 0.75rem; }
  details.wiki-all-data dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.15rem 0.75rem;
    margin: 0;
  }
  details.wiki-all-data dd { margin: 0; }
  details.wiki-all-data ul { margin: 0; padding-left: 1rem; word-break: break-all; }
  details.wiki-all-data pre {
    margin: 0;
    padding: 0.5rem;
    max-height: 16rem;
    overflow: auto;
    white-space: pre-wrap;
    background: var(--nl-card-bg, #f9fafb);
    border-radius: 0.375rem;
  }
`;
