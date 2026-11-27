/**
 * User-facing text of <np-menu-button>, with English defaults. Apps override any of it with its
 * `messages` property (e.g. translations).
 */
export interface MenuButtonMessages {
  /** The button's accessible name */
  more: string;
}

export const DEFAULT_MENU_BUTTON_MESSAGES: MenuButtonMessages = {
  more: 'More',
};
