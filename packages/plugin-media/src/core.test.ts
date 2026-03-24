import type { PostField } from '@nostr-post/plugins/types';
import { describe, expect, it } from 'vitest';
import { extractMediaUrls, mediaPlugin } from './core';

const requireMethod = <T>(method: T | undefined, methodName: string): T => {
  if (!method) {
    throw new Error(`${methodName} is not implemented`);
  }
  return method;
};

describe('extractMediaUrls', () => {
  it('extracts only image and video URLs', () => {
    const text =
      'Image https://cdn.example.com/a.jpg and page https://example.com/post/123 and video https://cdn.example.com/b.mp4';
    expect(extractMediaUrls(text)).toEqual([
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.mp4',
    ]);
  });

  it('deduplicates extracted URLs', () => {
    const text = 'https://cdn.example.com/x.webp https://cdn.example.com/x.webp';
    expect(extractMediaUrls(text)).toEqual(['https://cdn.example.com/x.webp']);
  });

  it('ignores non-media URLs', () => {
    const text = 'Read https://example.com/post/123 and see https://example.com/about';
    expect(extractMediaUrls(text)).toEqual([]);
  });

  it('skips URLs with trailing punctuation that are not valid URLs', () => {
    const text = 'Check this out: https://example.com/path?x=1, and (https://example.org/abc).';
    expect(extractMediaUrls(text)).toEqual([]);
  });
});

describe('mediaPlugin.enrichFormData', () => {
  const enrichFormData = requireMethod(mediaPlugin.enrichFormData, 'mediaPlugin.enrichFormData');

  const field: PostField = {
    id: 'media',
    type: 'string',
    uiPlugin: 'media',
    mapTo: { kind: 1, target: 'tag', tagName: 'r' },
  };

  it('does nothing when no source field is configured', () => {
    const result = enrichFormData(
      {
        content: 'See https://example.com/post and https://cdn.example.com/image.jpg',
        media: ['https://cdn.example.com/image.jpg'],
      },
      field
    );

    expect(result).toEqual({});
  });

  it('extracts media from attachTo when configured', () => {
    const result = enrichFormData(
      {
        body: 'https://cdn.example.com/photo.webp https://cdn.example.com/video.mp4',
      },
      {
        ...field,
        attachTo: 'body',
      }
    );

    expect(result).toEqual({
      media: ['https://cdn.example.com/photo.webp', 'https://cdn.example.com/video.mp4'],
    });
  });

  it('does nothing when auto extraction is disabled', () => {
    const result = enrichFormData(
      {
        content: 'https://cdn.example.com/image.jpg',
      },
      {
        ...field,
        metadata: { urlAutoExtract: false },
      }
    );

    expect(result).toEqual({});
  });

  it('supports legacy urlAutoExtractFrom metadata', () => {
    const result = enrichFormData(
      {
        body: 'https://cdn.example.com/image.jpg',
      },
      {
        ...field,
        metadata: { urlAutoExtractFrom: 'body' },
      }
    );

    expect(result).toEqual({ media: ['https://cdn.example.com/image.jpg'] });
  });
});
