import { describe, expect, it } from 'vitest';
import { escapeCsvValue, toCsv } from './csv.js';
import { buildExportTable } from './export.js';
import type { Column } from './types.js';

interface Person {
	name: string;
	age: number;
	active: boolean;
}

const rows: Person[] = [
	{ name: 'Alice', age: 30, active: true },
	{ name: 'Bob "The Builder"', age: 35, active: false },
	{ name: 'Line\nBreak; and, comma', age: 25, active: true }
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name },
	{ id: 'age', header: 'Age', value: (row) => row.age },
	{
		id: 'active',
		header: 'Active',
		value: (row) => row.active,
		format: (value) => (value ? 'yes' : 'no')
	}
];

describe('escapeCsvValue', () => {
	it('leaves simple values untouched', () => {
		expect(escapeCsvValue('Alice')).toBe('Alice');
	});

	it('quotes separators, quotes, newlines and padded values', () => {
		expect(escapeCsvValue('a,b')).toBe('"a,b"');
		expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
		expect(escapeCsvValue('a\nb')).toBe('"a\nb"');
		expect(escapeCsvValue(' padded ')).toBe('" padded "');
		expect(escapeCsvValue('a;b', ';')).toBe('"a;b"');
	});
});

describe('buildExportTable', () => {
	it('returns headers plus raw values and formatted text', () => {
		const table = buildExportTable(rows.slice(0, 1), columns);

		expect(table.header).toEqual(['Name', 'Age', 'Active']);
		expect(table.body[0]).toEqual([
			{ value: 'Alice', text: 'Alice' },
			{ value: 30, text: '30' },
			{ value: true, text: 'yes' }
		]);
	});

	it('can skip the header and pick columns', () => {
		const table = buildExportTable(rows, columns, { header: false, columns: [columns[1]] });

		expect(table.header).toEqual([]);
		expect(table.body.map((line) => line[0].text)).toEqual(['30', '35', '25']);
	});

	it('prepends row numbers when asked', () => {
		const table = buildExportTable(rows.slice(0, 2), [columns[0]], { rowNumbers: true });

		expect(table.header).toEqual(['', 'Name']);
		expect(table.body.map((line) => line[0])).toEqual([
			{ value: 1, text: '1' },
			{ value: 2, text: '2' }
		]);
	});

	it('applies the row number header and format', () => {
		const table = buildExportTable(rows.slice(0, 2), [columns[0]], {
			rowNumbers: { header: '#', format: (value, row) => `${value}-${row.age}` }
		});

		expect(table.header).toEqual(['#', 'Name']);
		expect(table.body.map((line) => line[0])).toEqual([
			{ value: 1, text: '1-30' },
			{ value: 2, text: '2-35' }
		]);
	});
});

describe('toCsv', () => {
	it('writes a header and CRLF separated rows', () => {
		const csv = toCsv(rows.slice(0, 2), columns);

		expect(csv).toBe('Name,Age,Active\r\nAlice,30,yes\r\n"Bob ""The Builder""",35,no');
	});

	it('quotes embedded newlines and commas', () => {
		const csv = toCsv(rows.slice(2), columns, { header: false });
		expect(csv).toBe('"Line\nBreak; and, comma",25,yes');
	});

	it('supports a custom delimiter and newline', () => {
		const csv = toCsv(rows.slice(0, 2), columns, { delimiter: ';', newline: '\n' });
		expect(csv).toBe('Name;Age;Active\nAlice;30;yes\n"Bob ""The Builder""";35;no');
	});

	it('exports an empty grid as just the header', () => {
		expect(toCsv([], columns)).toBe('Name,Age,Active');
	});

	it('writes row numbers as the first column', () => {
		const csv = toCsv(rows.slice(0, 2), [columns[1]], { rowNumbers: { header: 'No' } });
		expect(csv).toBe('No,Age\r\n1,30\r\n2,35');
	});
});
