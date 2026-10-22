import { describe, expect, it } from 'vitest';
import { getVisiblePageNumbers } from './pagination';

describe('getVisiblePageNumbers', () => {
  it('returns all page numbers when there are five or fewer pages', () => {
    expect(getVisiblePageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('keeps a five-page window centered around the current page', () => {
    expect(getVisiblePageNumbers(9, 20)).toEqual([7, 8, 9, 10, 11]);
  });

  it('keeps the page window within the first and last page boundaries', () => {
    expect(getVisiblePageNumbers(1, 20)).toEqual([1, 2, 3, 4, 5]);
    expect(getVisiblePageNumbers(20, 20)).toEqual([16, 17, 18, 19, 20]);
  });
});
