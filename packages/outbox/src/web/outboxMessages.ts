/**
 * User-facing text of <nostr-post-outbox>, with English defaults. Apps override any of it
 * through its `messages` property (e.g. translations).
 */

import type { OutboxAction, OutboxState } from '../item';

export interface OutboxMessages {
  heading: string;
  empty: string;
  states: Record<OutboxState, string>;
  /** An item stuck uploading or publishing (`isInterrupted`): it runs again by itself */
  interrupted: string;
  actions: Record<OutboxAction, string>;
  /** Runs every item that can go: uploads included, over mobile data too */
  sendAll: string;
  /** Bytes to upload */
  size: (bytes: number) => string;
  /** How long an item has waited */
  waited: (seconds: number) => string;
  /** A timed post's time */
  sendAt: (date: Date) => string;
  /** A timed post past its time (the app was closed) */
  late: string;
  /** Files wait for wifi */
  onWifi: string;
  /** Unsigned until it's sent: the signer is asked then */
  signLater: string;
  /** Items waiting several days: browsers may clear them */
  oldWarning: string;
  untitled: string;
}

const duration = (seconds: number): string => {
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} days`;
};

export const DEFAULT_OUTBOX_MESSAGES: OutboxMessages = {
  heading: 'Outbox',
  empty: 'Nothing waiting',
  states: {
    draft: 'Draft',
    waiting: 'Waiting',
    uploading: 'Uploading…',
    publishing: 'Publishing…',
    published: 'Published',
    failed: 'Failed',
  },
  interrupted: 'Stopped (the app was closed or the signer did not answer): retries by itself',
  actions: {
    'upload-now': 'Upload now',
    'send-now': 'Send now',
    retry: 'Retry',
    cancel: 'Cancel',
    edit: 'Edit',
    remove: 'Remove',
  },
  sendAll: 'Send all now',
  size: (bytes) =>
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} kB`,
  waited: (seconds) => (seconds < 60 ? 'just now' : `waiting ${duration(seconds)}`),
  sendAt: (date) => `at ${date.toLocaleString()}`,
  late: 'late: sent when the app opened',
  onWifi: 'uploads on wifi',
  signLater: 'signed when sent',
  oldWarning:
    'Some items have waited for days: browsers may clear a site’s data after a week without use.',
  untitled: 'Untitled',
};
