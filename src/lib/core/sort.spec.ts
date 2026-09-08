import { describe, expect, it } from 'vitest';
import { compareValues, nextSortState, sortEntries, sortRows } from './sort.js';
import type { Column } from './types.js';

interface Person {
	name: string;
	age: number;
}

const rows: Person[] = [
	{ name: 'Bob', age: 35 },
	{ name: 'Alice', age: 30 },
	{ name: 'Carol', age: 25 }
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name, sortable: true },
	{ id: 'age', header: 'Age', value: (row) => row.age, sortable: true }
];

describe('compareValues', () => {
	it('compares numbers numerically', () => {
		expect(compareValues(2, 10)).toBeLessThan(0);
	});

	it('places nullish values last', () => {
		expect(compareValues(null, 1)).toBeGreaterThan(0);
		expect(compareValues(1, undefined)).toBeLessThan(0);
	});
});

describe('sortRows', () => {
	it('returns the original array when no sort is given', () => {
		expect(sortRows(rows, columns, null)).toBe(rows);
	});

	it('sorts ascending without mutating the input', () => {
		const sorted = sortRows(rows, columns, { columnId: 'age', direction: 'asc' });
		expect(sorted.map((row) => row.age)).toEqual([25, 30, 35]);
		expect(rows[0].age).toBe(35);
	});

	it('sorts descending', () => {
		const sorted = sortRows(rows, columns, { columnId: 'name', direction: 'desc' });
		expect(sorted.map((row) => row.name)).toEqual(['Carol', 'Bob', 'Alice']);
	});
});

describe('sortEntries', () => {
	it('keeps the original row index', () => {
		const entries = rows.map((row, index) => ({ row, index }));
		const sorted = sortEntries(entries, columns, { columnId: 'age', direction: 'asc' });
		expect(sorted.map((entry) => entry.index)).toEqual([2, 1, 0]);
	});

	it('ignores an unknown column', () => {
		const entries = rows.map((row, index) => ({ row, index }));
		expect(sortEntries(entries, columns, { columnId: 'nope', direction: 'asc' })).toBe(entries);
	});
});

describe('nextSortState', () => {
	it('cycles asc -> desc -> none', () => {
		const asc = nextSortState(null, 'name');
		expect(asc).toEqual({ columnId: 'name', direction: 'asc' });

		const desc = nextSortState(asc, 'name');
		expect(desc).toEqual({ columnId: 'name', direction: 'desc' });

		expect(nextSortState(desc, 'name')).toBeNull();
	});

	it('starts ascending on a different column', () => {
		expect(nextSortState({ columnId: 'name', direction: 'desc' }, 'age')).toEqual({
			columnId: 'age',
			direction: 'asc'
		});
	});
});
