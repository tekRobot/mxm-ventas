import { describe, it, expect } from 'vitest';
import { sortPaqueteriaLast } from './sortCartItems';

const item = (code) => ({ code });

describe('sortPaqueteriaLast', () => {
  it('moves items whose code starts with 99PAQ to the end', () => {
    const items = [item('99PAQ100'), item('30378110'), item('26381810')];

    const result = sortPaqueteriaLast(items);

    expect(result.map((i) => i.code)).toEqual(['30378110', '26381810', '99PAQ100']);
  });

  it('keeps the relative order of non-paqueteria items', () => {
    const items = [item('B'), item('A'), item('99PAQ100'), item('C')];

    const result = sortPaqueteriaLast(items);

    expect(result.map((i) => i.code)).toEqual(['B', 'A', 'C', '99PAQ100']);
  });

  it('keeps the relative order among multiple paqueteria items', () => {
    const items = [item('99PAQ200'), item('X'), item('99PAQ100')];

    const result = sortPaqueteriaLast(items);

    expect(result.map((i) => i.code)).toEqual(['X', '99PAQ200', '99PAQ100']);
  });

  it('does not mutate the original array', () => {
    const items = [item('99PAQ100'), item('A')];

    sortPaqueteriaLast(items);

    expect(items.map((i) => i.code)).toEqual(['99PAQ100', 'A']);
  });

  it('returns an empty array when given an empty array', () => {
    expect(sortPaqueteriaLast([])).toEqual([]);
  });
});
