/**
 * User-facing text of <np-copy>, with English defaults. Apps override any of it with its
 * `messages` property (e.g. translations).
 */
export interface CopyMessages {
  copy: string;
  copied: string;
  /** The clipboard refused (e.g. an insecure page) */
  failed: string;
}

export const DEFAULT_COPY_MESSAGES: CopyMessages = {
  copy: 'Copy',
  copied: 'Copied',
  failed: "Couldn't copy",
};
