/**
 * @nostr-post/ui - Class and part names
 *
 * The names every UI target shares: the `np-` classes of the primitives (shadow DOM and light
 * DOM), and the `part` names components expose for `::part()` styling.
 */

/** Classes of the shared primitives (see `primitivesCss`) */
export const npClass = {
  app: 'np-app',
  headline: 'np-headline',
  title: 'np-title',
  button: 'np-button',
  iconButton: 'np-icon-button',
  field: 'np-field',
  label: 'np-label',
  input: 'np-input',
  hint: 'np-hint',
  fieldError: 'np-field-error',
  checkbox: 'np-checkbox',
  chip: 'np-chip',
  badge: 'np-badge',
  card: 'np-card',
  cardHeader: 'np-card-header',
  cardIcon: 'np-card-icon',
  cardTitle: 'np-card-title',
  cardSubtitle: 'np-card-subtitle',
  list: 'np-list',
  listItem: 'np-list-item',
  divider: 'np-divider',
  dialog: 'np-dialog',
  dialogHeader: 'np-dialog-header',
  dialogTitle: 'np-dialog-title',
  dialogBody: 'np-dialog-body',
  dialogActions: 'np-dialog-actions',
  menu: 'np-menu',
  menuItem: 'np-menu-item',
  segmented: 'np-segmented',
  segment: 'np-segment',
  tabs: 'np-tabs',
  tab: 'np-tab',
  message: 'np-message',
  empty: 'np-empty',
  loading: 'np-loading',
  progress: 'np-progress',
  avatar: 'np-avatar',
  toolbar: 'np-toolbar',
  spacer: 'np-spacer',
} as const;

/** Modifier classes, combined with a primitive class (`np-button np-filled`) */
export const npModifier = {
  filled: 'np-filled',
  tonal: 'np-tonal',
  outlined: 'np-outlined',
  text: 'np-text',
  elevated: 'np-elevated',
  danger: 'np-danger',
  small: 'np-small',
  selected: 'np-selected',
  active: 'np-active',
  required: 'np-required',
  invalid: 'np-invalid',
  primary: 'np-primary',
  error: 'np-error',
  success: 'np-success',
  warning: 'np-warning',
  info: 'np-info',
  tertiary: 'np-tertiary',
} as const;

/**
 * Part names components expose, the same in every component, so one `::part()` rule styles
 * them all: `nostr-post-composer::part(button)`. An element can carry several (`button primary`).
 */
export const npPart = {
  /** The component's outer box */
  container: 'container',
  /** A card or item of a list or feed */
  card: 'card',
  header: 'header',
  title: 'title',
  content: 'content',
  footer: 'footer',
  actions: 'actions',
  /** Any button; the main action also carries `primary` */
  button: 'button',
  primary: 'primary',
  /** Text inputs, textareas and selects */
  input: 'input',
  label: 'label',
  hint: 'hint',
  error: 'error',
  chip: 'chip',
  badge: 'badge',
  dialog: 'dialog',
  menu: 'menu',
  avatar: 'avatar',
  media: 'media',
} as const;

export type NpPart = (typeof npPart)[keyof typeof npPart];

/**
 * Every part name, for `exportparts` on a component inside another: the outer component's
 * `::part()` then reaches the inner one (`<nostr-post-view exportparts=${npExportParts}>`).
 */
export const npExportParts: string = Object.values(npPart).join(', ');
