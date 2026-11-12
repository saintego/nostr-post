/**
 * @nostr-post/web - Styles of <nostr-post-menu> and its dialogs
 */

import { css } from 'lit';

export const postMenuStyles = css`
  :host {
    position: relative;
    display: inline-block;
    font-size: var(--np-text-sm);
  }
  .menu {
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 10;
  }
  .raw-dialog::part(dialog) {
    width: min(48rem, calc(100vw - 2 * var(--np-space-4)));
  }
  .raw {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.25rem 0.75rem;
  }
  dt {
    color: var(--np-color-on-surface-variant);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  ul {
    margin: 0;
    padding-left: 1rem;
  }
  h4 {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin: 1rem 0 0.25rem;
  }
  .tags td {
    padding: 0.125rem 0.5rem 0.125rem 0;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  pre,
  .sig {
    display: block;
    padding: 0.5rem;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--np-color-surface-container-low);
    border-radius: var(--np-radius-xs);
  }
`;
