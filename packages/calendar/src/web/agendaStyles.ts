import { css } from 'lit';

/** <nostr-calendar-agenda>'s buttons, day headings and month grid */
export const agendaStyles = css`
  :host {
    display: block;
  }

  .agenda-nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .agenda-nav button {
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.25rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: #ffffff;
    color: #1f2937;
  }

  .agenda-range {
    margin-left: 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  :host-context(.dark) .agenda-nav button {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  :host-context(.dark) .agenda-range {
    color: #9ca3af;
  }

  .agenda-loading {
    font-size: 0.875rem;
    color: #6b7280;
  }

  :host-context(.dark) .agenda-loading {
    color: #9ca3af;
  }

  /* The previous window's days, while the next window loads */
  .agenda-days.stale {
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .month-grid {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin-bottom: 1rem;
    font-size: 0.75rem;
  }

  .month-grid th {
    padding: 0.25rem;
    font-weight: 600;
    color: #6b7280;
  }

  .month-grid td {
    height: 4.5rem;
    vertical-align: top;
    border: 1px solid #e5e7eb;
    padding: 0.125rem;
  }

  .month-grid td.outside {
    color: #9ca3af;
    background: #f9fafb;
  }

  .month-grid .day-number {
    align-self: flex-start;
  }

  .month-grid td.today .day-number {
    color: #ffffff;
    background: #6366f1;
    border-radius: 999px;
    padding: 0 0.375rem;
  }

  .month-grid .day {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.125rem;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .month-grid .day-event {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    background: #eef2ff;
    color: #3730a3;
    border-radius: 3px;
    padding: 0 0.25rem;
  }

  .month-grid .day-more {
    color: #6b7280;
  }

  :host-context(.dark) .month-grid td {
    border-color: #374151;
  }

  :host-context(.dark) .month-grid td.outside {
    background: #111827;
    color: #6b7280;
  }

  :host-context(.dark) .month-grid th,
  :host-context(.dark) .month-grid .day-more {
    color: #9ca3af;
  }

  :host-context(.dark) .month-grid .day-event {
    background: #312e81;
    color: #e0e7ff;
  }

  .agenda-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.75rem;
    padding: 0.375rem 0.25rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .agenda-row.open {
    background: #eef2ff;
  }

  .agenda-time {
    flex: none;
    width: 4.5rem;
    font-variant-numeric: tabular-nums;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .agenda-main {
    flex: 1;
    min-width: 12rem;
    display: flex;
    flex-direction: column;
  }

  .agenda-title {
    font: inherit;
    font-weight: 600;
    color: #1f2937;
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: none;
    /* Some titles are whole paragraphs: two lines here, all of it under Details */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  a.agenda-title:hover,
  button.agenda-title:hover {
    text-decoration: underline;
  }

  .agenda-place,
  .agenda-topics {
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .agenda-topics {
    display: flex;
    gap: 0.375rem;
  }

  .agenda-more {
    font: inherit;
    font-size: 0.8125rem;
    background: none;
    border: none;
    color: #6366f1;
    cursor: pointer;
  }

  .agenda-open {
    padding: 0.5rem 0 1rem;
  }

  :host-context(.dark) .agenda-row {
    border-bottom-color: #1f2937;
  }

  :host-context(.dark) .agenda-row.open {
    background: #1e1b4b;
  }

  :host-context(.dark) .agenda-title {
    color: #f3f4f6;
  }

  :host-context(.dark) .agenda-time,
  :host-context(.dark) .agenda-place,
  :host-context(.dark) .agenda-topics {
    color: #9ca3af;
  }

  :host-context(.dark) .agenda-more {
    color: #a5b4fc;
  }

  .agenda-date {
    font-size: 0.9375rem;
    font-weight: 600;
    margin: 1.25rem 0 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--nl-border, #e5e7eb);
    color: var(--nl-text, #111827);
  }

  :host-context(.dark) .agenda-date {
    color: #f3f4f6;
    border-bottom-color: #374151;
  }
`;
