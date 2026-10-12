import { describe, expect, it } from 'vitest';
import { withHookTags } from './publishSummaries';

describe('withHookTags', () => {
  it('adds hook tags the event lacks, once', () => {
    const tags: [string, ...string[]][] = [
      ['d', 'x-brewery'],
      ['a', '30818:pk:x-venue'],
    ];
    expect(
      withHookTags(tags, [
        ['a', '30818:pk:x-venue'],
        ['a', '30818:pk:y-venue'],
      ])
    ).toEqual([...tags, ['a', '30818:pk:y-venue']]);
  });
});
