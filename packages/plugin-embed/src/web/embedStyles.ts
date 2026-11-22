import { css } from 'lit';

export const embedStyles = css`
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

`;
