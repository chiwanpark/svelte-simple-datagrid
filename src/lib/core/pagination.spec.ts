import { describe, expect, it } from 'vitest';
import { clampPage, pageCount, pageNumbers, pageRange, paginate } from './pagination.js';

describe('pageCount', () => {
	it('counts partial pages', () => {
		expect(pageCount(57, 10)).toBe(6);
	});

	it('never drops below one page', () => {
		expect(pageCount(0, 10)).toBe(1);
	});
});

describe('clampPage', () => {
	it('clamps to the available pages', () => {
		expect(clampPage(99, 57, 10)).toBe(6);
		expect(clampPage(-3, 57, 10)).toBe(1);
	});
});

describe('paginate', () => {
	const items = Array.from({ length: 25 }, (_, index) => index);

	it('returns the requested slice', () => {
		expect(paginate(items, 3, 10)).toEqual([20, 21, 22, 23, 24]);
	});

	it('clamps out of range pages', () => {
		expect(paginate(items, 9, 10)).toEqual([20, 21, 22, 23, 24]);
	});
});

describe('pageRange', () => {
	it('describes the visible rows', () => {
		expect(pageRange(2, 57, 10)).toEqual({ start: 11, end: 20 });
		expect(pageRange(6, 57, 10)).toEqual({ start: 51, end: 57 });
	});

	it('handles an empty grid', () => {
		expect(pageRange(1, 0, 10)).toEqual({ start: 0, end: 0 });
	});

	it('covers everything when pagination is off', () => {
		expect(pageRange(1, 42, 0)).toEqual({ start: 1, end: 42 });
	});
});

describe('pageNumbers', () => {
	it('centers the current page', () => {
		expect(pageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7]);
	});

	it('sticks to the edges', () => {
		expect(pageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5]);
		expect(pageNumbers(10, 10)).toEqual([6, 7, 8, 9, 10]);
	});

	it('never exceeds the page count', () => {
		expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
	});
});
