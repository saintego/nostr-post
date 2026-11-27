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

  .ln np-qr {
    align-self: center;
  }

  .wide {
    width: 100%;
    justify-content: center;
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

  /* Cards of one shape in a grid; with grid-items they join the parent's grid */
  .lns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--np-space-4);
    align-items: start;
  }

  :host([grid-items]) {
    display: contents;
  }

  :host([grid-items]) .lns {
    display: contents;
  }

  .ln-rows {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-3);
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
