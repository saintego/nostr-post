import { css } from 'lit';

/** Styles of <nostr-wiki-view> */
export const viewStyles = css`
  :host {
    display: block;
    font-family: var(--np-font-family);
    font-size: var(--np-text-md);
    line-height: 1.5;
  }

  * { box-sizing: border-box; }

  .wiki-view {
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-md);
    background: var(--np-color-surface);
    overflow: hidden;
  }

  /* ── Header ── */
  .wiki-header {
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--np-color-outline-variant);
    background: var(--np-color-surface-container-low);
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    flex-wrap: wrap;
  }
  .wiki-header h2 {
    font-size: var(--np-text-xl);
    font-weight: 500;
    margin: 0;
    color: var(--np-color-on-surface);
    flex: 1;
  }

  /* ── Infobox table ── */
  dl.wiki-infobox {
    display: grid;
    /* minmax(0, …): a wide value (a player, a map) can't widen the page */
    grid-template-columns: minmax(80px, auto) minmax(0, 1fr);
    margin: 0;
    padding: 0;
    border-bottom: 1px solid var(--np-color-outline-variant);
  }
  .wiki-field { display: contents; }

  .wiki-field dt,
  .wiki-field dd {
    padding: 0.45rem 1rem;
    border-bottom: 1px solid var(--np-color-outline-variant);
    margin: 0;
  }
  .wiki-field:last-child dt,
  .wiki-field:last-child dd { border-bottom: none; }

  .wiki-field dt[title] { cursor: help; text-decoration: underline dotted; }

  .wiki-field dt {
    font-size: var(--np-text-xs);
    font-weight: 600;
    color: var(--np-color-on-surface-variant);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--np-color-surface-container-low);
    display: flex;
    align-items: center;
  }
  .wiki-field dd {
    color: var(--np-color-on-surface);
    font-size: var(--np-text-md);
    display: flex;
    align-items: center;
    min-width: 0;
  }
  /* A plugin's view (players, a map, a list) takes the row's width */
  .wiki-field dd > * { flex: 1; min-width: 0; }

  /* ── Prose ── */
  .wiki-prose {
    padding: 0.875rem 1.25rem;
    color: var(--np-color-on-surface);
    line-height: 1.7;
    font-size: var(--np-text-md);
    white-space: pre-wrap;
    word-break: break-word;
  }
  /* A plugin's view (e.g. formatted Markdown) lays out its own text */
  .wiki-prose > * { white-space: normal; }

  /* ── Sections (reviews, photos…): the same side padding as the text ── */
  nostr-post-sections { padding: 0 1.25rem 0.75rem; }

  /* ── Contributors ── */
  details.wiki-contributors { border-top: 1px solid var(--np-color-outline-variant); }
  details.wiki-contributors summary {
    padding: 0.5rem 1.25rem;
    cursor: pointer;
    font-size: var(--np-text-sm);
    color: var(--np-color-primary);
    font-weight: 500;
    user-select: none;
  }
  .wiki-contributor {
    display: flex;
    justify-content: space-between;
    padding: 0.2rem 1.25rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    font-family: var(--np-font-family-mono);
  }

  /* ── State messages ── */
  p {
    padding: 1.5rem;
    text-align: center;
    color: var(--np-color-on-surface-variant);
    margin: 0;
  }

  .wiki-sources {
    padding: 0.4rem 1.25rem;
    border-top: 1px solid var(--np-color-outline-variant);
    font-size: var(--np-text-xs);
    color: var(--np-color-on-surface-variant);
  }
  .wiki-sources a { color: inherit; }
  .wiki-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.5rem 1.25rem;
    border-top: 1px solid var(--np-color-outline-variant);
    font-size: var(--np-text-sm);
  }
  .wiki-links-label {
    font-weight: 600;
    color: var(--np-color-on-surface-variant);
  }
  .wiki-links a { color: var(--np-color-primary); }
  details.wiki-all-data {
    border-top: 1px solid var(--np-color-outline-variant);
    padding: 0.5rem 1.25rem;
    font-size: var(--np-text-sm);
  }
  details.wiki-all-data summary {
    cursor: pointer;
    color: var(--np-color-on-surface-variant);
    font-weight: 500;
  }
  details.wiki-all-data h4 { margin: 0.6rem 0 0.25rem; font-size: var(--np-text-sm); }
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
    background: var(--np-color-surface-container-low);
    border-radius: var(--np-radius-sm);
  }
`;
