import { css } from 'lit';

/** Styles of <wiki-entity-picker> */
export const pickerStyles = css`
  :host {
    display: block;
    font-family: inherit;
  }

  /* ── Selected chip ── */
  .selected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    background: var(--np-color-secondary-container);
    border: 1px solid transparent;
    border-radius: var(--np-radius-sm);
    color: var(--np-color-on-secondary-container);
  }
  .selected-name {
    font-size: var(--np-text-md);
    font-weight: 500;
    flex: 1;
  }
  .selected-slug {
    font-size: var(--np-text-xs);
    opacity: 0.8;
    font-family: var(--np-font-family-mono);
  }
  .selected.unlinked {
    background: none;
    border-style: dashed;
  }
  .selected.unlinked .selected-slug { font-family: inherit; font-style: italic; }
  .selected.unconfirmed { border-style: dashed; border-color: var(--np-color-warning); }
  .selected.unconfirmed .selected-slug { font-family: inherit; color: var(--np-color-warning); }
  .match-actions { margin-top: var(--np-space-4); }

  /* ── Picker wrapper ── */
  .picker { position: relative; }

  /* ── Dropdown ── */
  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 100;
    padding: 0;
    overflow: hidden;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    cursor: pointer;
    border-bottom: 1px solid var(--np-color-outline-variant);
    transition: background 0.1s;
    outline: none;
  }
  .result-item:last-of-type { border-bottom: none; }
  .result-item:hover,
  .result-item:focus {
    background: color-mix(in srgb, var(--np-color-primary) 8%, transparent);
  }
  .result-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .result-line {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    min-width: 0;
  }
  .result-title {
    font-size: var(--np-text-md);
    font-weight: 500;
    color: var(--np-color-on-surface);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .result-meta,
  .result-slug {
    flex-shrink: 0;
    font-size: var(--np-text-xs);
    color: var(--np-color-on-surface-variant);
  }
  .result-slug {
    font-family: var(--np-font-family-mono);
  }
  .result-snippet {
    min-width: 0;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-row {
    padding: 0.625rem 0.875rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  .create-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: none;
    border: none;
    border-top: 1px solid var(--np-color-outline-variant);
    cursor: pointer;
    font-size: var(--np-text-md);
    font-weight: 500;
    color: var(--np-color-primary);
    text-align: left;
    transition: background 0.1s;
  }
  .create-dtag {
    margin-left: auto;
    font-family: var(--np-font-family-mono);
    font-size: var(--np-text-sm);
    font-weight: 400;
    color: var(--np-color-on-surface-variant);
  }
  .create-btn:hover {
    background: color-mix(in srgb, var(--np-color-primary) 8%, transparent);
  }
`;
