/**
 * @nostr-post/web - Styles for <nostr-post-view>
 */

import { css } from 'lit';

export const viewStyle = css`

  /* Wraps on narrow screens: the event actions (RSVP, Add to calendar, …) go to the next row */
  .view-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--np-space-2) var(--np-space-3);
    margin-bottom: var(--np-space-2);
    font-size: var(--np-text-sm);
  }

  .view-action {
    max-width: 100%;
  }

  .view-avatar {
    width: 2em;
    height: 2em;
  }

  .view-author {
    font-weight: 600;
    color: var(--np-color-on-surface);
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .view-pubkey {
    font-family: var(--np-font-family-mono);
    color: var(--np-color-on-surface-variant);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .view-timestamp {
    color: var(--np-color-on-surface-variant);
    margin-left: auto;
    white-space: nowrap;
  }

  .view-content {
    white-space: normal;
    word-break: break-word;
    line-height: 1.6;
    color: var(--np-color-on-surface);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .view-content > * {
    margin: 0;
  }

  .view-content np-hashtag-view,
  .view-content np-media-view,
  .linked-field np-hashtag-view,
  .linked-field np-media-view {
    align-self: start;
  }

  .view-source {
    margin-top: var(--np-space-2);
    font-size: var(--np-text-sm);
  }
  .view-source a {
    color: inherit;
  }
  .view-manifest-note {
    margin-top: 0.5rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  .note-link,
  .note-hashtag {
    color: var(--np-color-primary);
    text-decoration: none;
    word-break: break-all;
  }

  .note-link:hover {
    text-decoration: underline;
  }

  .note-media {
    display: block;
    width: fit-content;
    max-width: 100%;
    margin: 0.5rem 0;
  }

  .note-media img,
  video.note-media {
    display: block;
    max-width: 100%;
    max-height: 28rem;
    border-radius: var(--np-radius-sm);
  }

  .note-code {
    background: var(--np-color-surface-container);
    padding: 2px 4px;
    border-radius: var(--np-radius-xs);
    font-family: var(--np-font-family-mono);
  }

  .note-heading {
    margin: 1rem 0 0.5rem 0;
    font-size: var(--np-text-xl);
  }

  .view-tags {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--np-color-outline-variant);
  }

  .tag {
    margin: var(--np-space-1) var(--np-space-1) var(--np-space-1) 0;
  }

  .tag-name {
    font-weight: 600;
    margin-right: 0.25rem;
  }

  .view-id {
    margin-top: 0.35rem;
    font-size: var(--np-text-xs);
    font-family: var(--np-font-family-mono);
    color: var(--np-color-on-surface-variant);
    word-break: break-all;
  }

  .linked-data {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--np-color-outline-variant);
  }

  .linked-data-label {
    font-size: var(--np-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--np-color-on-surface-variant);
    margin-bottom: 0.5rem;
  }

  .linked-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    font-size: var(--np-text-md);
  }

  .linked-field-label[title] {
    cursor: help;
    text-decoration: underline dotted;
  }

  .linked-field-label {
    font-weight: 500;
    color: var(--np-color-on-surface-variant);
    min-width: 100px;
  }

  .view-edit-button {
    margin-top: var(--np-space-2);
  }

  .view-updates {
    margin-top: 0.5rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  .view-updates-summary {
    cursor: pointer;
    user-select: none;
    color: var(--np-color-on-surface-variant);
  }

  .view-updates-list {
    margin: 0.25rem 0 0 1rem;
    padding: 0;
    list-style: disc;
  }

  .view-updates-list li {
    margin-bottom: 0.125rem;
  }

  .view-suggestion-author {
    font-family: var(--np-font-family-mono);
  }
  .view-suggestion-line {
    margin-right: 0.5rem;
  }
  .view-suggestion-toggle {
    margin-left: var(--np-space-1);
  }

  .view-inline-composer {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--np-color-outline-variant);
  }
  .view-edit-hint {
    margin: 0 0 0.5rem;
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface-variant);
  }

  details.view-raw {
    margin-top: 0.75rem;
    font-size: var(--np-text-sm);
  }
  details.view-raw summary {
    cursor: pointer;
    color: var(--np-color-on-surface-variant);
    font-weight: 500;
  }
  details.view-raw dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.15rem 0.75rem;
    margin: 0.5rem 0;
    word-break: break-all;
  }
  details.view-raw dd { margin: 0; }
  details.view-raw h4 { margin: 0.6rem 0 0.25rem; font-size: var(--np-text-sm); }
  details.view-raw pre {
    margin: 0;
    padding: 0.5rem;
    max-height: 16rem;
    overflow: auto;
    white-space: pre-wrap;
    border-radius: var(--np-radius-sm);
    background: var(--np-color-surface-container-low);
  }

  /* A referenced entity in a role (e.g. "Tasted at"), its wiki page opens on demand */
  .post-role {
    margin-top: 0.5rem;
    font-size: var(--np-text-md);
  }
  .post-role-label {
    color: var(--np-color-on-surface-variant);
    margin-bottom: 0.25rem;
  }
  .post-role summary {
    cursor: pointer;
    color: var(--np-color-on-surface-variant);
  }

  /* Tag fields with a built-in input: a title tag as heading, others as label: value */
  .tag-title {
    font-size: var(--np-text-lg);
    font-weight: 600;
    margin: 0.25rem 0;
  }
  .tag-row {
    font-size: var(--np-text-md);
    margin: 0.25rem 0;
  }
  .tag-label {
    color: var(--np-color-on-surface-variant);
  }

`;
