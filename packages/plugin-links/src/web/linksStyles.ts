import { css } from 'lit';

export const linksStyles = css`
  :host {
    display: block;
  }

  .links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--np-space-2);
  }

  .link-entry {
    display: inline-flex;
    align-items: center;
    gap: var(--np-space-2);
    max-width: 100%;
    text-decoration: none;
  }

  .host {
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
  }

  .bitcoin {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-2);
  }

  .bitcoin-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--np-space-2);
  }

  .address {
    font-family: var(--np-font-family-mono);
    font-size: var(--np-text-sm);
    overflow-wrap: anywhere;
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
