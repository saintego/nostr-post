import { describe, expect, it } from 'vitest';
import { addToFormData } from './formMerge';

describe('addToFormData', () => {
  it('appends new list items without repeats', () => {
    expect(addToFormData({ media: ['a', 'b'] }, { media: ['b', 'c'] })).toEqual({
      media: ['a', 'b', 'c'],
    });
  });

  it('fills empty fields and keeps filled ones', () => {
    expect(
      addToFormData(
        { title: 'Doomsday', genres: [] },
        { title: 'Other', genres: ['metal'], about: 'x' }
      )
    ).toEqual({ title: 'Doomsday', genres: ['metal'], about: 'x' });
  });

  it('turns a single value into a list when a list is added', () => {
    expect(addToFormData({ media: 'a' }, { media: ['b'] })).toEqual({ media: ['a', 'b'] });
  });
});
