/**
 * What's known about each media URL (type, hash, size, dimensions), for its `imeta` tag
 * (NIP-92, NIP-68 pictures). A field's value stays a list of URLs: uploads and posts read with
 * `imeta` tags tell the details here, and a Blossom URL names its own hash.
 */

import { blossomHash, typeOfExtension } from '@nostr-post/core/blossom';
import { imetaFiles, imetaTag, type MediaFileInfo } from '@nostr-post/core/imeta';
import type { PostField } from '@nostr-post/plugins/types';
import type { MediaPluginConfig } from './core';
import { toArray } from './values';

// Module state: facts about files (a URL's content doesn't change), shared by every field
const known = new Map<string, MediaFileInfo>();

/** Remember what's known about a file (an upload's answer, a post's `imeta` tag) */
export const rememberMediaFile = (info: MediaFileInfo): void => {
  known.set(info.url, { ...known.get(info.url), ...info });
};

/** What's known about a URL: remembered details, its hash if it's a Blossom URL, its type by extension */
export const mediaFileOf = (url: string): MediaFileInfo => {
  const info = known.get(url) ?? { url };
  const sha256 = info.sha256 ?? blossomHash(url);
  const extension = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1];
  const type = info.type ?? (extension ? typeOfExtension(extension) : undefined);
  return { ...info, ...(sha256 ? { sha256 } : {}), ...(type ? { type } : {}) };
};

const targetsOf = (field: PostField) => [field.mapTo].flat();

/** Whether the field writes `imeta` tags: mapped to the `imeta` tag, or `imeta: true` */
export const writesImeta = (field: PostField): boolean =>
  (field.metadata as MediaPluginConfig | undefined)?.imeta === true ||
  targetsOf(field).some((t) => t.target === 'tag' && t.tagName === 'imeta');

/** Whether the field's files live in `imeta` tags (its tag is `imeta`) */
export const readsImeta = (field: PostField): boolean =>
  targetsOf(field).some((t) => t.target === 'tag' && t.tagName === 'imeta');

/** One `imeta` tag per web URL of the value */
export const mediaImetaTags = (value: unknown): [string, ...string[]][] =>
  toArray(value)
    .filter((url) => /^https?:\/\//.test(url))
    .map((url) => imetaTag(mediaFileOf(url)));

/** The URLs of a post's `imeta` tags (their details remembered, e.g. to publish an edit) */
export const imetaUrls = (tags: string[][]): string[] =>
  imetaFiles(tags).map((info) => {
    rememberMediaFile(info);
    return info.url;
  });

/** Whether a `WxH` size is taller than wide; undefined when unknown */
const isPortrait = (dim: string | undefined): boolean | undefined => {
  const [width, height] = (dim ?? '').split('x').map(Number);
  return width && height ? height > width : undefined;
};

/**
 * What a media field's files are (the plugin's `describeMedia`): a photo or a video each, by its
 * type (else its extension), and portrait when its size is known
 */
export const describeMediaFiles = (
  value: unknown
): { media: 'image' | 'video'; portrait?: boolean }[] =>
  (Array.isArray(value) ? value : [value])
    .filter((url): url is string => typeof url === 'string' && url !== '')
    .map((url) => {
      const info = mediaFileOf(url);
      const media = info.type?.startsWith('video/') ? 'video' : 'image';
      const portrait = isPortrait(info.dim);
      return portrait === undefined ? { media } : { media, portrait };
    });
