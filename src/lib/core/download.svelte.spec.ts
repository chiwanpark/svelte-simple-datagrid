import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { csvBlob, CSV_MIME, downloadBlob, downloadCsv } from './download.js';
import type { Column } from './types.js';

interface Person {
	name: string;
	age: number;
}

const rows: Person[] = [
	{ name: 'Alice', age: 30 },
	{ name: 'Bob', age: 35 }
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name },
	{ id: 'age', header: 'Age', value: (row) => row.age }
];

let click: ReturnType<typeof vi.spyOn>;
let created: Blob[];

beforeEach(() => {
	created = [];
	click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
	URL.createObjectURL = vi.fn((blob: Blob) => {
		created.push(blob);
		return `blob:${created.length}`;
	});
	URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
	click.mockRestore();
	vi.restoreAllMocks();
});

function clickedAnchor() {
	return click.mock.instances[0] as HTMLAnchorElement;
}

describe('downloadBlob', () => {
	it('clicks a temporary anchor and cleans up', () => {
		downloadBlob(new Blob(['x']), 'file.txt');

		expect(clickedAnchor().download).toBe('file.txt');
		expect(clickedAnchor().href).toBe('blob:1');
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
		expect(document.querySelector('a[download]')).toBeNull();
	});
});

async function bytesOf(blob: Blob) {
	return new Uint8Array(await blob.arrayBuffer());
}

describe('csvBlob', () => {
	it('adds a BOM so Excel detects UTF-8', async () => {
		const blob = csvBlob(rows, columns);

		expect(blob.type).toBe(CSV_MIME);
		expect(Array.from((await bytesOf(blob)).subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
		expect(await blob.text()).toBe('Name,Age\r\nAlice,30\r\nBob,35');
	});

	it('can skip the BOM', async () => {
		const blob = csvBlob(rows, columns, { bom: false });

		expect((await bytesOf(blob))[0]).toBe('N'.charCodeAt(0));
		expect(await blob.text()).toBe('Name,Age\r\nAlice,30\r\nBob,35');
	});
});

describe('downloadCsv', () => {
	it('uses a default filename', () => {
		downloadCsv(rows, columns);
		expect(clickedAnchor().download).toBe('export.csv');
	});

	it('accept a custom filename and options', async () => {
		downloadCsv(rows, columns, { filename: 'people.csv', delimiter: ';', header: false });

		expect(clickedAnchor().download).toBe('people.csv');
		expect(await created[0].text()).toBe('Alice;30\r\nBob;35');
	});
});
