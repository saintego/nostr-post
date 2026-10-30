/**
 * @nostr-post/web - Suggested changes in <nostr-post-view>
 *
 * Update comments of people who aren't the event's editors (`suggestedUpdates`): listed under
 * the event with who suggested what. Each viewer can show the event with a suggestion applied,
 * only for themselves and only on this page; nothing is published.
 */

import type { DisplayableEvent } from '@nostr-post/core/types';
import { html, nothing, type TemplateResult } from 'lit';
import { truncatePubkey } from './userProfile';
import { parseUpdateComment } from './viewUpdates';

export interface SuggestionMessages {
  /** The list's summary, e.g. "2 suggested changes" */
  suggestions: (count: number) => string;
  /** Applies a suggestion for the viewer */
  showWith: string;
  /** Takes it back */
  showWithout: string;
}

export const DEFAULT_SUGGESTION_MESSAGES: SuggestionMessages = {
  suggestions: (n) => (n === 1 ? '1 suggested change' : `${n} suggested changes`),
  showWith: 'Show with this change',
  showWithout: 'Show without it',
};

export interface SuggestionsOptions {
  /** Ids of the suggestions shown applied */
  accepted: ReadonlySet<string>;
  onToggle: (id: string) => void;
  messages: SuggestionMessages;
}

const lines = (suggestion: DisplayableEvent) =>
  suggestion.content.split('\n').flatMap((line) => {
    const parsed = parseUpdateComment(line);
    return parsed ? [parsed] : [];
  });

export const renderSuggestions = (
  suggestions: DisplayableEvent[],
  { accepted, onToggle, messages: m }: SuggestionsOptions
): TemplateResult | typeof nothing => {
  if (suggestions.length === 0) return nothing;
  return html`
    <details class="view-updates view-suggestions">
      <summary class="view-updates-summary">${m.suggestions(suggestions.length)}</summary>
      <ul class="view-updates-list">
        ${suggestions.map((suggestion) => {
          const id = suggestion.id;
          const isAccepted = id !== undefined && accepted.has(id);
          return html`<li>
            <span class="view-suggestion-author" title=${suggestion.pubkey}
              >${truncatePubkey(suggestion.pubkey)}</span
            >:
            ${lines(suggestion).map(
              (u) =>
                html`<span class="view-suggestion-line"><strong>${u.fieldId}</strong>: ${u.rawValue}</span>`
            )}
            ${
              id
                ? html`<button
                    type="button"
                    class="view-suggestion-toggle"
                    aria-pressed=${isAccepted ? 'true' : 'false'}
                    @click=${() => onToggle(id)}
                  >
                    ${isAccepted ? m.showWithout : m.showWith}
                  </button>`
                : nothing
            }
          </li>`;
        })}
      </ul>
    </details>
  `;
};
