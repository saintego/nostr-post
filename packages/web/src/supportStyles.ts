import { css } from 'lit';

export const supportStyles = css`
  :host {
    display: block;
  }

  .support {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-4);
  }

  .support-head {
    display: flex;
    align-items: center;
    gap: var(--np-space-3);
  }

  .support-head h2 {
    flex: 1;
    margin: 0;
    font-size: var(--np-text-xl);
  }

  .support-section {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-2);
  }

  .support-section h3 {
    margin: 0;
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface-variant);
  }

  np-dialog::part(dialog) {
    width: min(40rem, 100vw - 2rem);
  }
`;
