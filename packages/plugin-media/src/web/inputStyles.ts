/** Styles of <np-media-input>, light and dark (`dark` class on an ancestor) */

import { css } from 'lit';

export const mediaInputStyles = css`
  :host {
    display: block;
  }
  .container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .upload-later {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.5rem;
    font-size: var(--np-text-sm);
  }
  /* Gallery */
  .gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .drop-zone:focus-visible {
    outline: 2px solid var(--np-color-primary);
    outline-offset: 2px;
  }
  .gallery-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 120px;
  }
  .alt-input {
    min-height: 2em;
    padding: var(--np-space-1) var(--np-space-2);
    font-size: var(--np-text-sm);
  }

  .gallery-card {
    position: relative;
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
    overflow: hidden;
    width: 120px;
    height: 90px;
    background: var(--np-color-surface-container);
  }
  .gallery-card img,
  .gallery-card video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .gallery-card .badge {
    position: absolute;
    bottom: 4px;
    left: 4px;
    background: color-mix(in srgb, var(--np-color-scrim) 60%, transparent);
    color: var(--np-color-on-scrim);
    padding: 0 4px;
    border-radius: var(--np-radius-xs);
    font-size: var(--np-text-xs);
  }
  .gallery-card .placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--np-text-xs);
    color: var(--np-color-on-surface-variant);
    padding: 0.25rem;
    word-break: break-all;
    text-align: center;
  }
  .gallery-card .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    background: color-mix(in srgb, var(--np-color-scrim) 60%, transparent);
    color: var(--np-color-on-scrim);
    border: none;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    cursor: pointer;
    font-size: var(--np-text-sm);
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gallery-card .remove-btn:hover {
    background: color-mix(in srgb, var(--np-color-error) 80%, transparent);
  }

  /* Drop zone */
  .drop-zone {
    border: 2px dashed var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
    padding: 1.5rem 1rem;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .drop-zone:hover,
  .drop-zone.dragover {
    border-color: var(--np-color-primary);
    background: color-mix(in srgb, var(--np-color-primary) 4%, transparent);
  }
  .drop-zone.uploading {
    border-color: color-mix(in srgb, var(--np-color-primary) 40%, transparent);
    opacity: 0.7;
    pointer-events: none;
  }
  .drop-icon {
    font-size: var(--np-text-2xl);
    margin-bottom: 0.25rem;
  }
  .drop-text {
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface-variant);
    margin: 0;
  }
  .drop-hint {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    margin: 0.25rem 0 0;
  }
  .camera-buttons {
    margin-top: var(--np-space-2);
  }
  .camera-input,
  .file-input {
    display: none;
  }

  /* URL input */
  .url-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .separator {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .url-input {
    flex: 1;
  }

  /* Progress & status */
  .progress-bar {
    height: 4px;
    background: var(--np-color-secondary-container);
    border-radius: var(--np-radius-full);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--np-color-primary);
    transition: width 0.3s;
    border-radius: var(--np-radius-xs);
  }
  .upload-status {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    text-align: center;
  }

  .quality {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }
  .quality select {
    width: auto;
    min-height: 2.25em;
    padding: var(--np-space-1) var(--np-space-2);
  }

`;
