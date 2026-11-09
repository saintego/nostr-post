import { describe, expect, it } from 'vitest';
import { accepts } from './camera';

describe('accepts', () => {
  it('tells which camera buttons a field takes', () => {
    expect(accepts('image/*,video/*', 'image')).toBe(true);
    expect(accepts('image/*,video/*', 'video')).toBe(true);
    expect(accepts('image/jpeg, image/png', 'image')).toBe(true);
    expect(accepts('image/*', 'video')).toBe(false);
  });
});
