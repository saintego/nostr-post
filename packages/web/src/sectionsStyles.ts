/** Styles of <nostr-post-sections> (colors from the --np-* tokens, light and dark) */

import { css } from 'lit';

export const sectionsStyles = css`
  :host {
    display: block;
  }
  section {
    margin-top: 1rem;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .head {
    margin-bottom: var(--np-space-2);
  }
  .item {
    padding: 0.375rem 0;
    border-top: 1px solid var(--np-color-outline-variant);
    font-size: var(--np-text-md);
  }
  summary {
    cursor: pointer;
  }
  /* The text next to the marker; the byline below it */
  summary > div:first-child {
    display: inline;
  }
  .item-view {
    display: block;
    margin-top: 0.375rem;
  }
  .byline,
  .status {
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
  }
  .byline {
    font-size: var(--np-text-sm);
  }
  .stats {
    font-size: var(--np-text-md);
    margin-bottom: 0.375rem;
  }
  button.more {
    margin-top: 0.375rem;
  }
  dialog {
    width: min(48rem, calc(100vw - 2 * var(--np-space-4)));
  }
  .also {
    display: flex;
    flex-wrap: wrap;
    gap: var(--np-space-2) var(--np-space-4);
    margin: 0 0 var(--np-space-3);
    padding: var(--np-space-2) var(--np-space-3);
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
  }
  .also-page {
    display: inline-flex;
    align-items: center;
    gap: var(--np-space-1);
  }
`;
