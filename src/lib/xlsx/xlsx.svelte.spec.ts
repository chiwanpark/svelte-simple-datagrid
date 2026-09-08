import { unzipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Column } from '../core/types.js';
import { downloadXlsx, xlsxBlob } from './index.js';

interface Person {
	name: string;
	age: number;
	joined: Date;
}

const rows: Person[] = [
	{ name: 'Ünïcodé ☃', age: 30, joined: new Date('2024-03-05T00:00:00Z') },
	{ name: 'Bob & "Co" <x>', age: 35.5, joined: new Date('2023-01-31T00:00:00Z') }
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name },
	{ id: 'age', header: 'Age', value: (row) => row.age },
	{ id: 'joined', header: 'Joined', value: (row) => row.joined }
];

let click: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
	URL.createObjectURL = vi.fn(() => 'blob:test');
	URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
	click.mockRestore();
	vi.restoreAllMocks();
});

async function unzip(blob: Blob) {
	return unzipSync(new Uint8Array(await blob.arrayBuffer()));
}

describe('xlsx export through write-excel-file', () => {
	it('produces a real workbook', async () => {
		const blob = await xlsxBlob(rows, columns, { sheetName: 'People' });
		const files = await unzip(blob);
		const decoder = new TextDecoder();

		expect(Object.keys(files)).toContain('xl/worksheets/sheet1.xml');
		expect(decoder.decode(files['xl/workbook.xml'])).toContain('People');

		const sheet = decoder.decode(files['xl/worksheets/sheet1.xml']);
		expect(sheet).toContain('35.5');
		expect(sheet).toContain('pane');

		const strings = decoder.decode(files['xl/sharedStrings.xml']);
		expect(strings).toContain('Ünïcodé ☃');
		expect(strings).toContain('Bob &amp; "Co" &lt;x&gt;');
	});

	it('downloads with the given filename', async () => {
		await downloadXlsx(rows, columns, { filename: 'people.xlsx' });

		const anchor = click.mock.instances[0] as HTMLAnchorElement;
		expect(anchor.download).toBe('people.xlsx');
		expect(URL.revokeObjectURL).toHaveBeenCalled();
	});

	it('defaults the filename', async () => {
		await downloadXlsx(rows, columns);
		expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('export.xlsx');
	});
});
