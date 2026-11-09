/**
 * User-facing text of the media plugin's upload (<np-media-input>, the text field's
 * "Add media" button, paste and drop), with English defaults. Apps override any of it with
 * <np-media-input>'s `messages` property, or setMediaMessages for the text field's upload.
 */

import type { MediaQuality } from '../core';

export interface MediaMessages {
  /** The text field's button */
  addMedia: string;
  /** In its panel: the button choosing files, and the drop zone's text */
  chooseMedia: string;
  dropMedia: string;
  /** Label of the photo quality choice */
  quality: string;
  qualityLevels: Record<MediaQuality, string>;
  /** What a level means; `maxSide`: its longest side in px (none for `full`) */
  qualityDescription: (quality: MediaQuality, maxSide?: number) => string;
  /** About all levels, under them */
  qualityHint: string;
  /** The same, for a field that keeps photos' metadata (`keepMetadata`) */
  qualityHintKeepsMetadata: string;
  /** While a photo is shrunk on the device */
  preparing: (fileName: string) => string;
  uploading: (fileName: string) => string;
  /** Shown with the upload: original and uploaded size */
  sizes: (original: string, uploaded: string) => string;
  /** A try failed (connection lost, stalled, server error); the next follows soon */
  interrupted: (fileName: string) => string;
  /** …and the browser is offline: the next try starts when it's back */
  waitingForConnection: (fileName: string) => string;
  /** Another try: `attempt` of `attempts` */
  retrying: (fileName: string, attempt: number, attempts: number) => string;
  /** A server refused or failed it: the next one is tried */
  otherServer: (fileName: string, host: string) => string;
  cancel: string;
  uploaded: (fileName: string) => string;
  uploadFailed: (fileName: string) => string;
  /** The upload server wants the user signed in (NIP-98) and no one is */
  signInToUpload: (fileName: string) => string;
  tooLarge: (maxMb: number) => string;
  /** <np-media-input>'s drop zone */
  dropFiles: string;
  /** Under it: where files go (the first server tried) and the size limit */
  dropHint: (host: string, maxMb: number) => string;
  /** On phones, next to the drop zone: the camera */
  takePhoto: string;
  recordVideo: string;
  /** Between the drop zone and the URL input */
  or: string;
  urlPlaceholder: string;
  remove: string;
  /** Files added out of the most allowed */
  fileCount: (count: number, max: number) => string;
  /** Upload later: the choice, what it does, and why it didn't apply */
  uploadLater: string;
  uploadLaterHint: string;
  /** No Blossom server: the photos are uploaded and the post signed when they go */
  uploadLaterSignLater: string;
  /** A photo's description (`alt: true`): its label and placeholder */
  altLabel: string;
  altPlaceholder: string;
}

export const DEFAULT_MEDIA_MESSAGES: MediaMessages = {
  addMedia: 'Add media',
  chooseMedia: 'Choose photos or videos',
  dropMedia: 'or drop them here',
  quality: 'Photo quality',
  qualityLevels: { low: 'Low', mid: 'Medium', full: 'Full (original)' },
  qualityDescription: (quality, maxSide) =>
    ({
      low: `Up to ${maxSide} px: the smallest file and fastest upload, fine on a phone.`,
      mid: `Up to ${maxSide} px: sharp on most screens, usually a fraction of the original's size.`,
      full: 'The file as it is: the largest and slowest upload.',
    })[quality],
  qualityHint:
    'Low and Medium shrink photos on your device before uploading. Details like where a photo was taken are removed from JPEG photos at any quality. Videos and GIFs are never changed.',
  qualityHintKeepsMetadata:
    'Low and Medium shrink photos on your device before uploading, which removes details like where a photo was taken; Full keeps them. Videos and GIFs are never changed.',
  preparing: (name) => `Preparing ${name}…`,
  uploading: (name) => `Uploading ${name}`,
  sizes: (original, uploaded) => (original === uploaded ? uploaded : `${original} → ${uploaded}`),
  interrupted: (name) => `Upload of ${name} interrupted, trying again…`,
  waitingForConnection: (name) => `Waiting for a connection to upload ${name}…`,
  retrying: (name, attempt, attempts) => `Uploading ${name} (try ${attempt} of ${attempts})`,
  otherServer: (name, host) => `Uploading ${name} to ${host}…`,
  cancel: 'Cancel upload',
  uploaded: (name) => `${name} added`,
  uploadFailed: (name) => `Couldn't upload ${name}`,
  signInToUpload: (name) => `Sign in to upload ${name}: the upload is signed with your Nostr key`,
  tooLarge: (maxMb) => `File too large (max ${maxMb} MB)`,
  dropFiles: 'Drop files here, click to browse, or paste',
  takePhoto: 'Take photo',
  recordVideo: 'Record video',
  dropHint: (host, maxMb) => `Uploads to ${host} (max ${maxMb} MB each)`,
  or: 'or',
  urlPlaceholder: 'Paste a photo, or a URL and press Enter',
  remove: 'Remove',
  uploadLater: 'Upload later, on wifi',
  uploadLaterHint:
    'Photos wait in the outbox and upload on wifi or when you choose; the post is published after',
  uploadLaterSignLater:
    'Your signer will be asked when the photos upload: the post is signed with their links then',
  fileCount: (count, max) => `${count}/${max} files`,
  altLabel: 'Description of the photo',
  altPlaceholder: 'Describe the photo',
};

let appMessages: Partial<MediaMessages> = {};

/** Override the text of the text field's upload (button, progress), e.g. for translations */
export function setMediaMessages(messages: Partial<MediaMessages>): void {
  appMessages = messages;
}

/** The defaults with the app's overrides (setMediaMessages) and then `messages` */
export const mediaMessages = (messages: Partial<MediaMessages> = {}): MediaMessages => ({
  ...DEFAULT_MEDIA_MESSAGES,
  ...appMessages,
  ...messages,
});

/** A byte count as "840 KB" or "4.2 MB" */
export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
