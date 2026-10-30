/** Styles of <np-geo-input> */

import { css } from 'lit';

export const geoInputStyles = css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Search row */
    .search-row {
      display: flex;
      gap: 0.5rem;
    }

    .search-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .btn {
      padding: 0.5rem 0.75rem;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .btn-primary {
      background: #6366f1;
      color: white;
    }

    .btn-primary:hover {
      background: #4f46e5;
    }

    .btn-primary:disabled {
      background: #a5b4fc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    /* Search results dropdown */
    .search-results {
      position: relative;
    }

    .results-list {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      max-height: 200px;
      overflow-y: auto;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .result-item {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-size: 0.8125rem;
      border-bottom: 1px solid #f3f4f6;
      line-height: 1.4;
    }

    .result-item:last-child {
      border-bottom: none;
    }

    .result-item:hover {
      background: #f0f0ff;
    }

    /* Map */
    .map-wrapper {
      border-radius: 8px;
      border: 1px solid #d1d5db;
      overflow: hidden;
      height: 300px;
      position: relative;
    }

    .map-wrapper .map-inner {
      height: 100%;
      width: 100%;
    }

    /* Actions row */
    .actions-row {
      display: flex;
      gap: 0.5rem;
    }

    /* Coordinate inputs */
    .coords-row {
      display: flex;
      gap: 1rem;
    }

    .coord-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .coord-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .coord-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      font-family: monospace;
      outline: none;
      transition: border-color 0.15s;
      width: 100%;
      box-sizing: border-box;
    }

    .coord-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .hint {
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
    }

    .geohash-display {
      font-family: monospace;
      font-size: 0.875rem;
      color: #374151;
      background: #f3f4f6;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      text-align: center;
      letter-spacing: 0.05em;
    }

    /* Dark theme: colors.dark of @nostr-post/web's theme */
    :host-context(.dark) .search-input,
    :host-context(.dark) .coord-input {
      background: #374151;
      color: #f3f4f6;
      border-color: #4b5563;
    }

    :host-context(.dark) .btn-secondary {
      background: #374151;
      color: #f3f4f6;
      border-color: #4b5563;
    }

    :host-context(.dark) .btn-secondary:hover {
      background: #4b5563;
    }

    :host-context(.dark) .results-list {
      background: #1f2937;
      border-color: #4b5563;
    }

    :host-context(.dark) .result-item {
      border-bottom-color: #374151;
    }

    :host-context(.dark) .result-item:hover {
      background: #312e81;
    }

    :host-context(.dark) .map-wrapper {
      border-color: #4b5563;
    }

    :host-context(.dark) .coord-label {
      color: #9ca3af;
    }

    :host-context(.dark) .geohash-display {
      color: #f3f4f6;
      background: #374151;
    }
`;
