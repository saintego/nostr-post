import { css } from 'lit';

export const qrStyles = css`
  :host {
    display: block;
  }

  .qr {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: var(--np-space-2);
    max-width: 100%;
  }

  /* QR codes scan best dark on light, so the image keeps its own white square in dark themes */
  .qr-image {
    max-width: 100%;
    padding: 0;
    border: 0;
    line-height: 0;
    border-radius: var(--np-radius-sm);
    overflow: hidden;
    background: none;
    cursor: zoom-in;
  }

  .qr-image:focus-visible {
    outline: 2px solid var(--np-color-primary);
    outline-offset: 2px;
  }

  np-dialog::part(dialog) {
    width: min(100vw - 1rem, 100dvh - 7rem);
  }

  .qr-large {
    line-height: 0;
    border-radius: var(--np-radius-sm);
    overflow: hidden;
  }

  .qr-large svg {
    width: 100%;
    height: auto;
  }

  .qr-large-text {
    display: block;
    margin: var(--np-space-3) 0 0;
  }

  .qr-image svg {
    width: 100%;
    height: auto;
  }

  .qr-text {
    font-family: var(--np-font-family-mono);
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    overflow-wrap: anywhere;
    text-align: center;
  }

  .qr-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--np-space-2);
    justify-content: center;
  }

  .qrs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--np-space-4);
  }

  .qr-row {
    display: flex;
    gap: var(--np-space-2);
    align-items: center;
  }

  .qr-row input {
    flex: 1;
    min-width: 0;
  }
`;
