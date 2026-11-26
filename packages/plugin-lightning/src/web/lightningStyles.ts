import { css } from 'lit';

export const lightningStyles = css`
  :host {
    display: block;
  }

  .ln {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-3);
  }

  .ln-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--np-space-2);
  }

  .ln-target {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .amounts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--np-space-2);
    align-items: center;
  }

  .amounts input {
    width: 10rem;
  }

  .ln textarea {
    width: 100%;
    box-sizing: border-box;
  }

  .ln-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--np-space-2);
    align-items: center;
  }

  .zap-choice {
    display: flex;
    gap: var(--np-space-2);
    align-items: center;
  }

  .lns {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-4);
  }

  .ln-row {
    display: flex;
    gap: var(--np-space-2);
    align-items: center;
  }

  .ln-row input {
    flex: 1;
    min-width: 0;
  }
`;
