import { describe, expect, it } from 'vitest';
import {
	applyCellChanges,
	defaultFormat,
	defaultParse,
	emptyValue,
	formatCell,
	isColumnEditable,
	normalizeOptions,
	parseCell
} from './edit.js';
import type { CellChange, Column } from './types.js';

interface Person {
	name: string;
	age: number;
	active: boolean;
}

const rows: Person[] = [
	{ name: 'Alice', age: 30, active: true },
	{ name: 'Bob', age: 35, active: false }
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name },
	{ id: 'age', header: 'Age', value: (row) => row.age },
	{
		id: 'active',
		header: 'Active',
		value: (row) => row.active,
		format: (value) => (value ? 'Y' : 'N'),
		parse: (text) => text === 'Y'
	}
];

describe('defaultFormat', () => {
	it('renders nullish values as an empty string', () => {
		expect(defaultFormat(null)).toBe('');
		expect(defaultFormat(undefined)).toBe('');
	});

	it('renders dates as ISO days', () => {
		expect(defaultFormat(new Date('2024-03-05T10:00:00Z'))).toBe('2024-03-05');
	});
});

describe('defaultParse', () => {
	it('keeps the value type of the previous value', () => {
		expect(defaultParse('42', 1)).toBe(42);
		expect(defaultParse('yes', false)).toBe(true);
		expect(defaultParse('nope', 1)).toBe(1);
		expect(defaultParse('', 1)).toBeNull();
		expect(defaultParse('text', 'old')).toBe('text');
	});
});

describe('column format and parse hooks', () => {
	it('prefers the column implementation', () => {
		expect(formatCell(columns[2], rows[0], true)).toBe('Y');
		expect(parseCell(columns[2], rows[0], 'Y', false)).toBe(true);
		expect(parseCell(columns[1], rows[0], '7', 30)).toBe(7);
	});
});

describe('normalizeOptions', () => {
	const row = rows[0];

	it('normalizes primitive options', () => {
		const column: Column<Person> = {
			id: 'name',
			header: 'Name',
			value: (item) => item.name,
			options: ['Alice', 'Bob']
		};

		expect(normalizeOptions(column, row)).toEqual([
			{ value: 'Alice', label: 'Alice' },
			{ value: 'Bob', label: 'Bob' }
		]);
	});

	it('keeps explicit labels and disabled flags', () => {
		const column: Column<Person> = {
			id: 'age',
			header: 'Age',
			value: (item) => item.age,
			options: [
				{ value: 30, label: 'Thirty' },
				{ value: 40, disabled: true }
			]
		};

		expect(normalizeOptions(column, row)).toEqual([
			{ value: 30, label: 'Thirty', disabled: undefined },
			{ value: 40, label: '40', disabled: true }
		]);
	});

	it('labels options with the column format function', () => {
		expect(normalizeOptions({ ...columns[2], options: [true, false] }, row)).toEqual([
			{ value: true, label: 'Y' },
			{ value: false, label: 'N' }
		]);
	});

	it('supports row dependent options', () => {
		const column: Column<Person> = {
			id: 'name',
			header: 'Name',
			value: (item) => item.name,
			options: (item) => [item.name]
		};

		expect(normalizeOptions(column, rows[1])).toEqual([{ value: 'Bob', label: 'Bob' }]);
	});
});

describe('parseCell with options', () => {
	const column: Column<Person> = {
		id: 'age',
		header: 'Age',
		value: (item) => item.age,
		options: [{ value: 30, label: 'Thirty' }, { value: 40 }]
	};

	it('matches an option by label or value', () => {
		expect(parseCell(column, rows[0], 'Thirty', 0)).toBe(30);
		expect(parseCell(column, rows[0], '40', 0)).toBe(40);
	});

	it('keeps the previous value for unknown input', () => {
		expect(parseCell(column, rows[0], 'Fifty', 30)).toBe(30);
	});
});

describe('emptyValue', () => {
	it('matches the previous value type', () => {
		expect(emptyValue('text')).toBe('');
		expect(emptyValue(true)).toBe(false);
		expect(emptyValue(12)).toBeNull();
	});
});

describe('isColumnEditable', () => {
	it('falls back to the grid setting', () => {
		expect(isColumnEditable(columns[0], true)).toBe(true);
		expect(isColumnEditable(columns[0], false)).toBe(false);
		expect(isColumnEditable({ ...columns[0], editable: false }, true)).toBe(false);
	});
});

describe('applyCellChanges', () => {
	const changes: CellChange<Person>[] = [
		{ rowIndex: 0, row: rows[0], columnId: 'age', value: 31, previousValue: 30 },
		{ rowIndex: 1, row: rows[1], columnId: 'name', value: 'Bobby', previousValue: 'Bob' }
	];

	it('returns new rows without mutating the input', () => {
		const next = applyCellChanges(rows, changes, columns);

		expect(next[0]).toEqual({ name: 'Alice', age: 31, active: true });
		expect(next[1]).toEqual({ name: 'Bobby', age: 35, active: false });
		expect(rows[0].age).toBe(30);
		expect(rows[1].name).toBe('Bob');
		expect(next).not.toBe(rows);
	});

	it('uses a column setValue hook when provided', () => {
		const withSetter: Column<Person>[] = [
			{
				id: 'name',
				header: 'Name',
				value: (row) => row.name,
				setValue: (row, value) => ({ ...row, name: `${value as string}!` })
			}
		];

		const next = applyCellChanges(
			rows,
			[{ rowIndex: 0, row: rows[0], columnId: 'name', value: 'Zoe', previousValue: 'Alice' }],
			withSetter
		);
		expect(next[0].name).toBe('Zoe!');
	});

	it('ignores unknown columns and out of range rows', () => {
		expect(
			applyCellChanges(
				rows,
				[
					{ rowIndex: 9, row: rows[0], columnId: 'age', value: 1, previousValue: 0 },
					{ rowIndex: 0, row: rows[0], columnId: 'nope', value: 1, previousValue: 0 }
				],
				columns
			)
		).toEqual(rows);
	});

	it('returns the same array when there is nothing to change', () => {
		expect(applyCellChanges(rows, [], columns)).toBe(rows);
	});
});
