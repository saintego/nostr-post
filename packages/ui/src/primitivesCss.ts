/**
 * @nostr-post/ui - Shared primitives as CSS
 *
 * One source for both uses: components add it to their shadow DOM (`npPrimitives` in `/web`),
 * apps and plain HTML load it globally (`ui.css`, or `primitivesCss()` in a `<style>`).
 * Only `np-` classes are styled, never bare elements, and everything sits in the cascade layer
 * `np.primitives`, so a component's or page's own rules always win.
 *
 * Modifiers are extra classes: `np-button np-filled`, `np-message np-error`, `np-badge np-success`.
 */

import { cardRules } from './cardCss';
import { npClass } from './names';

/** Name of the cascade layer the primitives live in */
export const primitivesLayer = 'np.primitives';

const c = npClass;

const tones = ['primary', 'error', 'success', 'warning', 'info', 'tertiary'] as const;

const toneRules = (selector: string): string =>
  tones
    .map(
      (tone) => `${selector}.np-${tone} {
  background: var(--np-color-${tone}-container);
  color: var(--np-color-on-${tone}-container);
  border-color: color-mix(in srgb, var(--np-color-${tone}) 35%, transparent);
}`
    )
    .join('\n');

const rules = `
[class^='np-'],
[class*=' np-'] {
  box-sizing: border-box;
}
.${c.app} {
  background: var(--np-color-surface);
  color: var(--np-color-on-surface);
  font-family: var(--np-font-family);
  font-size: var(--np-text-md);
  line-height: var(--np-line-height);
}
.${c.headline} {
  margin: 0;
  font-size: var(--np-text-2xl);
  font-weight: 400;
  line-height: 1.25;
}
.${c.title} {
  margin: 0;
  font-size: var(--np-text-lg);
  font-weight: 500;
  line-height: 1.35;
}
.${c.button} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--np-space-2);
  min-height: 2.5em;
  padding: 0 var(--np-space-4);
  border: 1px solid var(--np-color-outline-variant);
  border-radius: var(--np-radius-full);
  background: transparent;
  color: var(--np-color-primary);
  font: inherit;
  font-size: var(--np-text-md);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--np-motion-duration) var(--np-motion-easing),
    box-shadow var(--np-motion-duration) var(--np-motion-easing),
    border-color var(--np-motion-duration) var(--np-motion-easing);
}
.${c.button}:hover:not(:disabled) {
  background: color-mix(in srgb, currentColor 8%, transparent);
}
.${c.button}:focus-visible {
  outline: none;
  box-shadow: var(--np-focus-ring);
}
.${c.button}:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.${c.button}.np-filled {
  background: var(--np-color-primary);
  border-color: var(--np-color-primary);
  color: var(--np-color-on-primary);
}
.${c.button}.np-filled:hover:not(:disabled) {
  background: color-mix(in srgb, var(--np-color-on-primary) 10%, var(--np-color-primary));
  box-shadow: var(--np-elevation-1);
}
.${c.button}.np-tonal {
  background: var(--np-color-secondary-container);
  border-color: transparent;
  color: var(--np-color-on-secondary-container);
}
.${c.button}.np-tonal:hover:not(:disabled) {
  background: color-mix(in srgb, var(--np-color-on-secondary-container) 10%, var(--np-color-secondary-container));
}
.${c.button}.np-outlined {
  border-color: var(--np-color-outline);
}
.${c.button}.np-text {
  border-color: transparent;
  padding: 0 var(--np-space-3);
}
.${c.button}.np-danger {
  color: var(--np-color-error);
}
.${c.button}.np-danger.np-filled {
  background: var(--np-color-error);
  border-color: var(--np-color-error);
  color: var(--np-color-on-error);
}
.${c.button}.np-small {
  min-height: 2em;
  padding: 0 var(--np-space-3);
  font-size: var(--np-text-sm);
}
.${c.iconButton} {
  display: inline-grid;
  place-items: center;
  width: 2.25em;
  height: 2.25em;
  padding: 0;
  border: 0;
  border-radius: var(--np-radius-full);
  background: transparent;
  color: var(--np-color-on-surface-variant);
  font: inherit;
  font-size: var(--np-text-md);
  line-height: 1;
  cursor: pointer;
}
.${c.iconButton}:hover:not(:disabled) {
  background: color-mix(in srgb, currentColor 10%, transparent);
}
.${c.iconButton}:focus-visible {
  outline: none;
  box-shadow: var(--np-focus-ring);
}
.${c.iconButton}:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.${c.field} {
  display: flex;
  flex-direction: column;
  gap: var(--np-space-1);
  min-width: 0;
}
.${c.label} {
  color: var(--np-color-on-surface);
  font-size: var(--np-text-sm);
  font-weight: 500;
}
.${c.label}.np-required::after {
  content: ' *';
  color: var(--np-color-error);
}
.${c.input} {
  width: 100%;
  min-height: 2.75em;
  padding: var(--np-space-2) var(--np-space-3);
  border: 1px solid var(--np-color-outline);
  border-radius: var(--np-radius-xs);
  background: var(--np-color-surface-container-lowest);
  color: var(--np-color-on-surface);
  font: inherit;
  font-size: var(--np-text-md);
  transition:
    border-color var(--np-motion-duration) var(--np-motion-easing),
    box-shadow var(--np-motion-duration) var(--np-motion-easing);
}
textarea.${c.input} {
  min-height: 6em;
  resize: vertical;
  line-height: var(--np-line-height);
}
.${c.input}::placeholder {
  color: var(--np-color-on-surface-variant);
  opacity: 0.8;
}
.${c.input}:hover:not(:disabled):not(:focus) {
  border-color: var(--np-color-on-surface);
}
.${c.input}:focus {
  outline: none;
  border-color: var(--np-color-primary);
  box-shadow: inset 0 0 0 1px var(--np-color-primary);
}
.${c.input}:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.${c.input}[aria-invalid='true'],
.${c.input}.np-invalid {
  border-color: var(--np-color-error);
}
.${c.hint} {
  color: var(--np-color-on-surface-variant);
  font-size: var(--np-text-sm);
}
.${c.fieldError} {
  color: var(--np-color-error);
  font-size: var(--np-text-sm);
}
.${c.checkbox} {
  display: inline-flex;
  align-items: center;
  gap: var(--np-space-2);
  color: var(--np-color-on-surface);
  font-size: var(--np-text-md);
  cursor: pointer;
}
.${c.checkbox} input {
  width: 1.15em;
  height: 1.15em;
  margin: 0;
  accent-color: var(--np-color-primary);
}

.${c.chip} {
  display: inline-flex;
  align-items: center;
  gap: var(--np-space-1);
  min-height: 2em;
  padding: 0 var(--np-space-3);
  border: 1px solid var(--np-color-outline-variant);
  border-radius: var(--np-radius-sm);
  background: transparent;
  color: var(--np-color-on-surface-variant);
  font: inherit;
  font-size: var(--np-text-sm);
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
}
button.${c.chip},
a.${c.chip} {
  cursor: pointer;
}
button.${c.chip}:hover,
a.${c.chip}:hover {
  background: color-mix(in srgb, currentColor 8%, transparent);
}
.${c.chip}:focus-visible {
  outline: none;
  box-shadow: var(--np-focus-ring);
}
.${c.chip}.np-selected,
.${c.chip}[aria-pressed='true'] {
  background: var(--np-color-secondary-container);
  border-color: transparent;
  color: var(--np-color-on-secondary-container);
}
.${c.badge} {
  display: inline-flex;
  align-items: center;
  gap: var(--np-space-1);
  padding: 0.1em 0.6em;
  border: 1px solid var(--np-color-outline-variant);
  border-radius: var(--np-radius-full);
  background: var(--np-color-surface-container-high);
  color: var(--np-color-on-surface-variant);
  font-size: var(--np-text-xs);
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}
${toneRules(`.${c.badge}`)}

${cardRules()}
.${c.list} {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
.${c.listItem} {
  display: flex;
  align-items: center;
  gap: var(--np-space-3);
  min-height: 3em;
  padding: var(--np-space-2) var(--np-space-4);
  color: var(--np-color-on-surface);
  text-align: start;
}
.${c.listItem} + .${c.listItem} {
  border-top: 1px solid var(--np-color-outline-variant);
}
button.${c.listItem} {
  width: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
button.${c.listItem}:hover,
.${c.listItem}.np-active {
  background: color-mix(in srgb, var(--np-color-on-surface) 8%, transparent);
}
.${c.divider} {
  height: 0;
  margin: var(--np-space-2) 0;
  border: 0;
  border-top: 1px solid var(--np-color-outline-variant);
}

.${c.dialog} {
  width: min(36rem, calc(100vw - 2 * var(--np-space-4)));
  max-height: calc(100vh - 2 * var(--np-space-8));
  padding: 0;
  border: 0;
  border-radius: var(--np-radius-lg);
  background: var(--np-color-surface-container-high);
  color: var(--np-color-on-surface);
  box-shadow: var(--np-elevation-3);
  font-family: var(--np-font-family);
  font-size: var(--np-text-md);
}
.${c.dialog}::backdrop {
  background: color-mix(in srgb, var(--np-color-scrim) 40%, transparent);
}
.${c.dialogHeader} {
  display: flex;
  align-items: center;
  gap: var(--np-space-2);
  padding: var(--np-space-4) var(--np-space-4) var(--np-space-2) var(--np-space-6);
}
.${c.dialogTitle} {
  flex: 1;
  margin: 0;
  font-size: var(--np-text-xl);
  font-weight: 500;
}
.${c.dialogBody} {
  padding: var(--np-space-2) var(--np-space-6);
  overflow: auto;
}
.${c.dialogActions} {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--np-space-2);
  padding: var(--np-space-4) var(--np-space-6) var(--np-space-5);
}
.${c.menu} {
  display: flex;
  flex-direction: column;
  min-width: 12rem;
  padding: var(--np-space-2) 0;
  border-radius: var(--np-radius-xs);
  background: var(--np-color-surface-container);
  color: var(--np-color-on-surface);
  box-shadow: var(--np-elevation-2);
}
.${c.menuItem} {
  display: flex;
  align-items: center;
  gap: var(--np-space-3);
  min-height: 2.75em;
  padding: 0 var(--np-space-4);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--np-text-md);
  text-align: start;
  text-decoration: none;
  cursor: pointer;
}
.${c.menuItem}:hover,
.${c.menuItem}:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--np-color-on-surface) 8%, transparent);
}
.${c.menuItem}.np-danger {
  color: var(--np-color-error);
}
.${c.segmented} {
  display: inline-flex;
  align-self: flex-start;
  width: fit-content;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 1px solid var(--np-color-outline);
  border-radius: var(--np-radius-full);
  overflow: hidden;
}
.${c.segment} {
  min-height: 2.25em;
  padding: 0 var(--np-space-4);
  border: 0;
  background: transparent;
  color: var(--np-color-on-surface);
  font: inherit;
  font-size: var(--np-text-sm);
  font-weight: 500;
  cursor: pointer;
}
.${c.segment} + .${c.segment} {
  border-left: 1px solid var(--np-color-outline);
}
.${c.segment}:hover {
  background: color-mix(in srgb, var(--np-color-on-surface) 8%, transparent);
}
.${c.segment}[aria-pressed='true'],
.${c.segment}[aria-selected='true'],
.${c.segment}.np-selected {
  background: var(--np-color-secondary-container);
  color: var(--np-color-on-secondary-container);
}
.${c.tabs} {
  display: flex;
  gap: var(--np-space-1);
  border-bottom: 1px solid var(--np-color-outline-variant);
  overflow-x: auto;
}
.${c.tab} {
  padding: var(--np-space-3) var(--np-space-4);
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--np-color-on-surface-variant);
  font: inherit;
  font-size: var(--np-text-md);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.${c.tab}[aria-selected='true'],
.${c.tab}.np-selected {
  border-bottom-color: var(--np-color-primary);
  color: var(--np-color-primary);
}

.${c.message} {
  padding: var(--np-space-3) var(--np-space-4);
  border: 1px solid var(--np-color-outline-variant);
  border-radius: var(--np-radius-sm);
  background: var(--np-color-surface-container);
  color: var(--np-color-on-surface);
  font-size: var(--np-text-md);
}
${toneRules(`.${c.message}`)}
.${c.empty},
.${c.loading} {
  padding: var(--np-space-8) var(--np-space-4);
  color: var(--np-color-on-surface-variant);
  text-align: center;
}
.${c.progress} {
  width: 100%;
  height: 4px;
  border: 0;
  border-radius: var(--np-radius-full);
  background: var(--np-color-secondary-container);
  accent-color: var(--np-color-primary);
  overflow: hidden;
  appearance: none;
}
.${c.progress}::-webkit-progress-bar {
  background: var(--np-color-secondary-container);
}
.${c.progress}::-webkit-progress-value {
  background: var(--np-color-primary);
}
.${c.progress}::-moz-progress-bar {
  background: var(--np-color-primary);
}
.${c.avatar} {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 2.5em;
  height: 2.5em;
  border-radius: var(--np-radius-full);
  background: var(--np-color-primary-container);
  color: var(--np-color-on-primary-container);
  font-weight: 500;
  object-fit: cover;
  overflow: hidden;
}
.${c.toolbar} {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--np-space-2);
}
.${c.spacer} {
  flex: 1;
}
@media (prefers-reduced-motion: reduce) {
  .${c.button}, .${c.iconButton}, .${c.input} {
    transition: none;
  }
}
`;

/** The primitives' rules (without the layer wrapper) */
export const primitiveRules = (): string => rules.trim();

/** The primitives in their cascade layer, for shadow DOM or a global stylesheet */
export const primitivesCss = (): string => `@layer ${primitivesLayer} {\n${primitiveRules()}\n}\n`;
