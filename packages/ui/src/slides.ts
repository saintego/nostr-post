/** Moving through slides (a lightbox's photos, a carousel), framework-free */

/** The slide after `index` moving by `step` (±1), wrapping around */
export const slideIndex = (index: number, step: number, count: number): number =>
  count === 0 ? 0 : (((index + step) % count) + count) % count;
