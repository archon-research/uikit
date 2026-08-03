import { describe, expect, it } from 'vitest';

import {
  flashClass,
  flashTwoPhaseClass,
  getCellFlashState,
  type CellFlashDirection,
} from './DataTable.js';

// These exercise the pure delta-detection/class-mapping logic behind both
// `flashOnUpdate` modes (single-phase `true` and two-phase `'two-phase'`) —
// `getCellFlashState` never touches React or the DOM, so it's testable
// exactly like `utils.ts`'s sorting helpers, without rendering `DataTable`.

describe('getCellFlashState', () => {
  it('does not flash a cell the first time it is seen', () => {
    const map = new Map();
    expect(getCellFlashState(map, 'row-1:value', 100)).toEqual({
      seq: 0,
      direction: 'none',
    });
  });

  it('flags a numeric increase as positive', () => {
    const map = new Map();
    getCellFlashState(map, 'row-1:value', 100);
    expect(getCellFlashState(map, 'row-1:value', 150)).toEqual({
      seq: 1,
      direction: 'positive',
    });
  });

  it('flags a numeric decrease as critical', () => {
    const map = new Map();
    getCellFlashState(map, 'row-1:value', 100);
    expect(getCellFlashState(map, 'row-1:value', 40)).toEqual({
      seq: 1,
      direction: 'critical',
    });
  });

  it('flags a non-numeric change as neutral', () => {
    const map = new Map();
    getCellFlashState(map, 'row-1:label', 'pending');
    expect(getCellFlashState(map, 'row-1:label', 'settled')).toEqual({
      seq: 1,
      direction: 'neutral',
    });
  });

  it('reports no flash while the value is unchanged, keeping the seq stable', () => {
    const map = new Map();
    getCellFlashState(map, 'row-1:value', 100);
    getCellFlashState(map, 'row-1:value', 150); // seq -> 1, positive
    expect(getCellFlashState(map, 'row-1:value', 150)).toEqual({
      seq: 1,
      direction: 'positive',
    });
  });

  it('bumps the seq again on every subsequent real change, even oscillating', () => {
    const map = new Map();
    getCellFlashState(map, 'row-1:value', 100);
    expect(getCellFlashState(map, 'row-1:value', 150).seq).toBe(1);
    expect(getCellFlashState(map, 'row-1:value', 90).seq).toBe(2);
    expect(getCellFlashState(map, 'row-1:value', 90).direction).toBe(
      'critical',
    );
  });

  it('tracks independent cells by key without cross-talk', () => {
    const map = new Map();
    getCellFlashState(map, 'row-1:value', 100);
    getCellFlashState(map, 'row-2:value', 100);
    expect(getCellFlashState(map, 'row-1:value', 200)).toEqual({
      seq: 1,
      direction: 'positive',
    });
    // row-2 never changed, so it's still a no-flash "first sighting" state.
    expect(getCellFlashState(map, 'row-2:value', 100)).toEqual({
      seq: 0,
      direction: 'none',
    });
  });
});

describe('flashClass (single-phase flashOnUpdate)', () => {
  it('emits no class for "none"', () => {
    expect(flashClass('none')).toBe(false);
  });

  it.each<[CellFlashDirection, string]>([
    ['positive', 'dataTable__bodyCell--flash_positive'],
    ['critical', 'dataTable__bodyCell--flash_critical'],
    ['neutral', 'dataTable__bodyCell--flash_neutral'],
  ])('maps %s to %s', (direction, className) => {
    expect(flashClass(direction)).toBe(className);
  });
});

describe('flashTwoPhaseClass (flashOnUpdate="two-phase")', () => {
  it('emits no class for "none"', () => {
    expect(flashTwoPhaseClass('none')).toBe(false);
  });

  it.each<[CellFlashDirection, string]>([
    ['positive', 'dataTable__bodyCell--flashTwoPhase_up'],
    ['critical', 'dataTable__bodyCell--flashTwoPhase_down'],
    ['neutral', 'dataTable__bodyCell--flashTwoPhase_neutral'],
  ])('maps %s to %s', (direction, className) => {
    expect(flashTwoPhaseClass(direction)).toBe(className);
  });
});
