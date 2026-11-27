import { css } from 'lit';

export const linksStyles = css`
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
    border-radius: var(--np-radius-sm);
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
    border: 1px dashed var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
    background: var(--np-color-surface-container-low);
    color: var(--np-color-on-surface);
    font: inherit;
    cursor: pointer;
  }

  .placeholder .note {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  .link {
    color: var(--np-color-primary);
    word-break: break-all;
  }

  /* A player's link, under it */
  .source {
    display: block;
    margin-top: 0.25rem;
    font-size: var(--np-text-sm);
  }

  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .row .np-input {
    flex: 1;
  }

  .link-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  /* <np-link>: a link and its ⋯ menu */
  .link-line {
    display: flex;
    align-items: flex-start;
    gap: var(--np-space-2);
    min-width: 0;
  }

  .link-body {
    flex: 1;
    min-width: 0;
  }

  .link-button {
    justify-content: center;
    width: 100%;
    text-decoration: none;
    font-weight: 600;
  }

  /* A site's own colours (its rule's data, e.g. Buy Me a Coffee's yellow) */
  .link-button.brand {
    background: var(--np-brand-background);
    color: var(--np-brand-color);
    border-color: transparent;
  }

  .link-button.brand:hover {
    filter: brightness(0.95);
  }

  .card {
    min-width: 0;
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    gap: var(--np-space-2);
  }

  .card-head .np-card-header {
    flex: 1;
  }

  /* Links as cards of one shape in a grid; with grid-items they join the parent's grid */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--np-space-4);
    align-items: start;
  }

  :host([grid-items]) {
    display: contents;
  }

  :host([grid-items]) .cards {
    display: contents;
  }

  .details {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: var(--np-space-2);
  }

  .details .wide {
    grid-column: 1 / -1;
  }

  np-dialog::part(dialog) {
    width: min(100vw - 1rem, 100dvh - 7rem, 32rem);
  }

`;
