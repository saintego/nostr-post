import { describe, expect, it } from 'vitest';
import { slideIndex } from './slides';

describe('slideIndex', () => {
  it('moves by a step and wraps around both ends', () => {
    expect(slideIndex(0, 1, 3)).toBe(1);
    expect(slideIndex(2, 1, 3)).toBe(0);
    expect(slideIndex(0, -1, 3)).toBe(2);
    expect(slideIndex(5, 0, 3)).toBe(2);
    expect(slideIndex(0, 1, 0)).toBe(0);
  });
});
