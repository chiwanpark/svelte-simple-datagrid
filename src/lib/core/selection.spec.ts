import { describe, expect, it } from 'vitest';
import {
	clampPosition,
	moveNextCell,
	movePosition,
	rectCellCount,
	rectContains,
	rectSize,
	toRect
} from './selection.js';

describe('toRect', () => {
	it('normalizes a reversed range', () => {
		expect(toRect({ row: 4, column: 3 }, { row: 1, column: 1 })).toEqual({
			top: 1,
			left: 1,
			bottom: 4,
			right: 3
		});
	});

	it('falls back to a single cell without an anchor', () => {
		expect(toRect(null, { row: 2, column: 2 })).toEqual({ top: 2, left: 2, bottom: 2, right: 2 });
	});

	it('returns null without a focus', () => {
		expect(toRect({ row: 0, column: 0 }, null)).toBeNull();
	});
});

describe('rect helpers', () => {
	const rect = { top: 1, left: 1, bottom: 2, right: 3 };

	it('detects contained cells', () => {
		expect(rectContains(rect, 2, 3)).toBe(true);
		expect(rectContains(rect, 0, 1)).toBe(false);
		expect(rectContains(null, 0, 0)).toBe(false);
	});

	it('measures the rect', () => {
		expect(rectSize(rect)).toEqual({ rows: 2, columns: 3 });
		expect(rectCellCount(rect)).toBe(6);
		expect(rectCellCount(null)).toBe(0);
	});
});

describe('clampPosition', () => {
	it('clamps to the grid bounds', () => {
		expect(clampPosition({ row: 9, column: -3 }, 3, 2)).toEqual({ row: 2, column: 0 });
	});

	it('returns null for an empty grid', () => {
		expect(clampPosition({ row: 0, column: 0 }, 0, 3)).toBeNull();
	});
});

describe('movePosition', () => {
	it('moves and clamps', () => {
		expect(movePosition({ row: 0, column: 0 }, 5, 1, 3, 3)).toEqual({ row: 2, column: 1 });
	});
});

describe('moveNextCell', () => {
	it('wraps to the next row', () => {
		expect(moveNextCell({ row: 0, column: 2 }, 1, 2, 3)).toEqual({ row: 1, column: 0 });
	});

	it('wraps to the previous row', () => {
		expect(moveNextCell({ row: 1, column: 0 }, -1, 2, 3)).toEqual({ row: 0, column: 2 });
	});

	it('returns null at the grid edges', () => {
		expect(moveNextCell({ row: 1, column: 2 }, 1, 2, 3)).toBeNull();
		expect(moveNextCell({ row: 0, column: 0 }, -1, 2, 3)).toBeNull();
	});
});
