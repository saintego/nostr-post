import { css } from 'lit';

/** Styles of <np-venue-wiki-publish> */
export const wikiPublishStyles = css`
  :host { display: block; margin: 0.75rem 0; font-size: 0.85rem; }
  .wiki-publish {
    padding: 0.75rem 1rem;
    border: 1px solid var(--nl-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--nl-card-bg, #f9fafb);
  }
  label.sync { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
  .plan { margin: 0.35rem 0; color: var(--nl-text-secondary, #6b7280); }
  .slug { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin: 0.35rem 0; }
  .slug-input { display: inline-flex; align-items: center; gap: 0.15rem; }
  .slug-input input {
    min-width: 12rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-family: monospace;
  }
  .slug code { font-size: 0.85em; color: var(--nl-text-secondary, #6b7280); }
  .slug.free .slug-status { color: #15803d; }
  .slug.taken .slug-status { color: #b91c1c; font-weight: 500; }
  .slug.unknown .slug-status, .slug.checking .slug-status { color: #92400e; }
  .qualifier { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; }
  .qualifier button {
    padding: 0.15rem 0.55rem;
    border: 1px solid var(--nl-border, #d1d5db);
    border-radius: 999px;
    background: white;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .extra-link { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin: 0.35rem 0; }
  .extra-link input {
    flex: 1;
    min-width: 12rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }
  .link-note { margin-bottom: 0.35rem; color: #92400e; }
  .attribution { font-size: 0.7rem; color: var(--nl-text-secondary, #9ca3af); }
  .attribution a { color: inherit; }

  :host-context(.dark) { color: #f3f4f6; }
  :host-context(.dark) .wiki-publish {
    border-color: var(--nl-border, #374151);
    background: var(--nl-card-bg, #1f2937);
  }
  :host-context(.dark) .plan,
  :host-context(.dark) .slug code,
  :host-context(.dark) .attribution { color: var(--nl-text-secondary, #9ca3af); }
  :host-context(.dark) .slug-input input,
  :host-context(.dark) .extra-link input,
  :host-context(.dark) .qualifier button {
    border-color: #4b5563;
    background: #111827;
    color: #f3f4f6;
  }
  :host-context(.dark) .slug.free .slug-status { color: #86efac; }
  :host-context(.dark) .slug.taken .slug-status { color: #fca5a5; }
  :host-context(.dark) .link-note,
  :host-context(.dark) .slug.unknown .slug-status,
  :host-context(.dark) .slug.checking .slug-status { color: #fcd34d; }
`;
