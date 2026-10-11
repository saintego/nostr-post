import { type TemplateResult, html } from 'lit';

/** The parts of an event the section shows; unsigned events have no id yet */
interface RawEvent {
  id?: string;
  pubkey: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

/**
 * User-facing text of a post's "All data" section. Apps can override it with
 * <nostr-post-view>'s `messages` property (e.g. from a translation library).
 */
export interface RawDataMessages {
  /** Summary of the collapsed section with everything the event contains */
  allData: (tagCount: number) => string;
  kind: string;
  author: string;
  eventId: string;
  created: string;
  tags: string;
  content: string;
}

export const DEFAULT_RAW_DATA_MESSAGES: RawDataMessages = {
  allData: (tagCount) => `All data (${tagCount} tag${tagCount === 1 ? '' : 's'})`,
  kind: 'Kind',
  author: 'Author',
  eventId: 'Event ID',
  created: 'Created',
  tags: 'Tags',
  content: 'Content',
};

/**
 * Everything the event contains, collapsed below the clean, manifest-based
 * rendering: so data the manifest doesn't show (extra tags, raw content) stays
 * visible on demand instead of always listing raw tags.
 */
export function renderRawData(event: RawEvent, m: RawDataMessages): TemplateResult {
  return html`
    <details class="view-raw">
      <summary>${m.allData(event.tags.length)}</summary>
      <dl>
        <dt>${m.kind}</dt><dd>${event.kind}</dd>
        <dt>${m.author}</dt><dd><code>${event.pubkey}</code></dd>
        ${event.id ? html`<dt>${m.eventId}</dt><dd><code>${event.id}</code></dd>` : ''}
        <dt>${m.created}</dt><dd>${new Date(event.created_at * 1000).toLocaleString()}</dd>
      </dl>
      <h4>${m.tags}</h4>
      <div class="view-tags">
        ${event.tags.map(
          (tag) =>
            html`<span class="tag"><span class="tag-name">${tag[0]}:</span> ${tag.slice(1).join(', ')}</span>`
        )}
      </div>
      ${event.content ? html`<h4>${m.content}</h4><pre>${event.content}</pre>` : ''}
    </details>
  `;
}
