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
  .attribution { font-size: 0.7rem; color: var(--nl-text-secondary, #9ca3af); }
  .attribution a { color: inherit; }
`;
