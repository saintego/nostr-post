import { css } from 'lit';

export const linksStyles = css`
  :host {
    display: block;
  }

  .links {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-2);
  }

  /* Cards of one shape in a grid; with grid-items they join the parent's grid */
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

  .method {
    min-width: 0;
  }

  .link-button {
    justify-content: center;
    text-decoration: none;
    font-weight: 600;
  }

  /* A known site's own colours (its data, e.g. Buy Me a Coffee's yellow) */
  .link-button.brand {
    background: var(--np-brand-background);
    color: var(--np-brand-color);
    border-color: transparent;
  }

  .link-button.brand:hover {
    filter: brightness(0.95);
  }

  .note {
    margin: 0;
    white-space: pre-wrap;
    color: var(--np-color-on-surface-variant);
  }

  .entry-editor {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--np-space-2);
    padding: var(--np-space-3);
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
  }

  .entry-editor .wide {
    grid-column: 1 / -1;
  }

  .entry-editor .icon-input {
    width: 4rem;
  }

  .entry-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
  }
`;
