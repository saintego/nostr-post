/** Styles of <np-lightbox> */

import { css } from 'lit';

export const lightboxStyles = css`
  dialog {
    width: min(64rem, calc(100vw - 2 * var(--np-space-4)));
    max-height: calc(100dvh - 2 * var(--np-space-4));
    padding: var(--np-space-3);
  }
  dialog::backdrop {
    background: var(--np-color-scrim);
    opacity: 0.8;
  }
  /* Full screen: the photo as large as the screen, on the scrim */
  dialog:fullscreen {
    width: 100vw;
    max-width: none;
    max-height: none;
    height: 100vh;
    border-radius: 0;
    background: var(--np-color-scrim);
    color: var(--np-color-on-scrim);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .slide {
    margin: 0;
  }
  .stage {
    position: relative;
    touch-action: pan-y;
  }
  img,
  video {
    display: block;
    max-width: 100%;
    max-height: 78dvh;
    margin: 0 auto;
    border-radius: var(--np-radius-sm);
  }
  dialog:fullscreen img,
  dialog:fullscreen video {
    max-height: calc(100vh - 6rem);
  }
  .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: var(--np-color-scrim);
    color: var(--np-color-on-scrim);
    opacity: 0.7;
    font-size: var(--np-text-xl);
  }
  .nav:hover,
  .nav:focus-visible {
    opacity: 1;
  }
  .prev {
    left: var(--np-space-2);
  }
  .next {
    right: var(--np-space-2);
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin-top: 0.5rem;
    font-size: var(--np-text-md);
  }
  .alt {
    flex-basis: 100%;
  }
  .byline {
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }
  dialog:fullscreen .count,
  dialog:fullscreen button {
    color: var(--np-color-on-scrim);
  }
  a {
    color: var(--np-color-primary);
  }
`;
