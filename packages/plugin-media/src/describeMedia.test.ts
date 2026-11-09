import { describe, expect, it } from 'vitest';
import { describeMediaFiles, rememberMediaFile } from './mediaFiles';

describe('describeMediaFiles', () => {
  it('tells photos from videos, and portrait ones when their size is known', () => {
    rememberMediaFile({ url: 'https://b.example/tall.mp4', type: 'video/mp4', dim: '1080x1920' });
    rememberMediaFile({ url: 'https://b.example/wide.jpg', type: 'image/jpeg', dim: '1600x900' });
    expect(
      describeMediaFiles([
        'https://b.example/tall.mp4',
        'https://b.example/wide.jpg',
        'https://b.example/other.webm',
        'pending:abc.mp4',
      ])
    ).toEqual([
      { media: 'video', portrait: true },
      { media: 'image', portrait: false },
      { media: 'video' },
      { media: 'video' },
    ]);
  });
});
