import { describe, expect, it, vi } from 'vitest';
import type { Column } from '../core/types.js';
import { buildXlsxSheet, sanitizeSheetName, xlsxBlob } from './index.js';

interface Person {
	name: string;
	age: number | null;
	active: boolean;
	joined: Date;
}

const rows: Person[] = [
	{ name: 'Alice', age: 30, active: true, joined: new Date('2024-03-05T00:00:00Z') },
	{ name: 'Bob', age: null, active: false, joined: new Date('2023-01-31T00:00:00Z') }
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name },
	{ id: 'age', header: 'Age', value: (row) => row.age },
	{ id: 'active', header: 'Active', value: (row) => row.active },
	{ id: 'joined', header: 'Joined', value: (row) => row.joined }
];

describe('sanitizeSheetName', () => {
	it('removes forbidden characters and truncates', () => {
		expect(sanitizeSheetName('a/b[c]:d*e?f')).toBe('a b c  d e f');
		expect(sanitizeSheetName('')).toBe('Sheet1');
		expect(sanitizeSheetName('x'.repeat(40))).toHaveLength(31);
	});
});

describe('buildXlsxSheet', () => {
	const sheet = buildXlsxSheet(rows, columns, { sheetName: 'People' });

	it('writes a bold header and sticks it to the top', () => {
		expect(sheet.data[0]).toEqual([
			{ value: 'Name', type: String, fontWeight: 'bold' },
			{ value: 'Age', type: String, fontWeight: 'bold' },
			{ value: 'Active', type: String, fontWeight: 'bold' },
			{ value: 'Joined', type: String, fontWeight: 'bold' }
		]);
		expect(sheet.options.stickyRowsCount).toBe(1);
		expect(sheet.options.sheet).toBe('People');
	});

	it('maps values to typed cells', () => {
		expect(sheet.data[1]).toEqual([
			{ value: 'Alice', type: String },
			{ value: 30, type: Number },
			{ value: true, type: Boolean },
			{ value: rows[0].joined, type: Date, format: 'yyyy-mm-dd' }
		]);
	});

	it('writes empty cells as null', () => {
		expect(sheet.data[2][1]).toBeNull();
	});

	it('accepts a custom date format', () => {
		const custom = buildXlsxSheet(rows, columns, { dateFormat: 'dd/mm/yyyy' });
		expect(custom.data[1][3]).toMatchObject({ format: 'dd/mm/yyyy' });
	});

	it('derives column widths from the content', () => {
		expect(sheet.options.columns).toEqual([
			{ width: 8 },
			{ width: 8 },
			{ width: 8 },
			{ width: 12 }
		]);
	});

	it('omits the header when asked', () => {
		const headerless = buildXlsxSheet(rows, columns, { header: false });

		expect(headerless.data).toHaveLength(2);
		expect(headerless.options.stickyRowsCount).toBeUndefined();
	});
});

describe('xlsxBlob', () => {
	it('passes the sheet to the injected writer', async () => {
		const toBlob = vi.fn(async () => new Blob(['x']));
		const writer = vi.fn(() => ({ toBlob }));

		const blob = await xlsxBlob(rows, columns, { writer, sheetName: 'People' });

		expect(writer).toHaveBeenCalledWith(
			buildXlsxSheet(rows, columns, { sheetName: 'People' }).data,
			buildXlsxSheet(rows, columns, { sheetName: 'People' }).options
		);
		expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	});
});
