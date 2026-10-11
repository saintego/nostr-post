import { html, nothing } from 'lit';
import type { WikiComposerMessages } from './wiki-composer-messages';

/** Whether a new entity's d-tag is used by another entity */
export type SlugStatus = 'idle' | 'checking' | 'free' | 'taken' | 'unknown';

interface SlugCheckProps {
  status: SlugStatus;
  dTag: string;
  qualifier: string;
  /** Values from other fields that could tell entities apart */
  suggestions: string[];
  placeholder: string;
  messages: WikiComposerMessages;
  onQualifier: (qualifier: string) => void;
  onCheckAgain: () => void;
}

function statusMessage({ status, dTag, messages, onCheckAgain }: SlugCheckProps) {
  switch (status) {
    case 'taken':
      return html`<p>${messages.slugTaken(dTag)}</p>`;
    case 'unknown':
      return html`<p>
        ${messages.slugUnknown(dTag)}
        <button type="button" @click=${onCheckAgain}>${messages.checkAgain}</button>
      </p>`;
    case 'free':
      return html`<p class="wiki-dtag-status">${messages.slugFree(dTag)}</p>`;
    default:
      return html`<p class="wiki-dtag-status">${messages.checkingSlug}</p>`;
  }
}

/**
 * For a new entity: whether its d-tag is free and, when it's taken, unknown or
 * already qualified, suggestions and an input to make it distinct.
 */
export function renderSlugCheck(props: SlugCheckProps) {
  const { status, qualifier, suggestions, placeholder, messages, onQualifier } = props;
  if (status === 'idle') return nothing;
  const needsInput = status === 'taken' || status === 'unknown' || !!qualifier;
  if (!needsInput) return statusMessage(props);
  return html`
    <div class="wiki-disambiguation" role=${status === 'taken' ? 'alert' : 'status'}>
      ${statusMessage(props)}
      ${
        suggestions.length > 0
          ? html`<div class="wiki-suggestions">
            ${suggestions.map(
              (text) =>
                html`<button type="button" @click=${() => onQualifier(text)}>${text}</button>`
            )}
          </div>`
          : nothing
      }
      <label>
        ${messages.distinguishBy}
        <input
          type="text"
          .value=${qualifier}
          placeholder=${placeholder}
          @input=${(e: InputEvent) => onQualifier((e.target as HTMLInputElement).value)}
        />
      </label>
    </div>
  `;
}
