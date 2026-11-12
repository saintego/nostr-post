/**
 * User-facing text of <np-dialog>, with English defaults. Apps override any of it with its
 * `messages` property (e.g. translations).
 */
export interface DialogMessages {
  close: string;
}

export const DEFAULT_DIALOG_MESSAGES: DialogMessages = {
  close: 'Close',
};
