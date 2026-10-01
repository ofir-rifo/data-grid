import { describe, expect, it } from 'vitest';
import type { ScrollPosition } from './scroll-position';

describe('ScrollPosition', () => {
  it('represents horizontal and vertical scroll offsets', () => {
    const scrollPosition: ScrollPosition = {
      scrollLeft: 120,
      scrollTop: 400,
    };

    expect(scrollPosition.scrollLeft).toBe(120);
    expect(scrollPosition.scrollTop).toBe(400);
  });
});
