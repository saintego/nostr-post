/**
 * @nostr-post/ui - The card primitive as CSS: `np-card` (+ `np-outlined`, `np-elevated`) and its
 * header row (`np-card-header` with `np-card-icon`, `np-card-title`, `np-card-subtitle`), part of
 * the primitives (`primitivesCss`)
 */

import { npClass } from './names';

const c = npClass;

export const cardRules = (): string => `
.${c.card} {
  display: flex;
  flex-direction: column;
  gap: var(--np-space-3);
  padding: var(--np-space-4);
  border: 1px solid transparent;
  border-radius: var(--np-radius-md);
  background: var(--np-color-surface-container-low);
  color: var(--np-color-on-surface);
}
.${c.card}.np-outlined {
  background: var(--np-color-surface);
  border-color: var(--np-color-outline-variant);
}
.${c.card}.np-elevated {
  background: var(--np-color-surface-container-low);
  box-shadow: var(--np-elevation-1);
}
.${c.cardHeader} {
  display: flex;
  align-items: center;
  gap: var(--np-space-3);
  min-width: 0;
}
.${c.cardIcon} {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--np-radius-full);
  background: var(--np-color-primary-container);
  color: var(--np-color-on-primary-container);
  font-size: var(--np-text-xl);
  line-height: 1;
}
.${c.cardTitle} {
  margin: 0;
  font-size: var(--np-text-lg);
  font-weight: 600;
  line-height: 1.3;
}
.${c.cardSubtitle} {
  margin: 0;
  color: var(--np-color-on-surface-variant);
  font-size: var(--np-text-sm);
  overflow-wrap: anywhere;
}
`;
