import { downloadBlob, XLSX_MIME } from '../core/download.js';
import {
	buildExportTable,
	type ExportCell,
	type XlsxOptions,
	type XlsxWriter
} from '../core/export.js';
import type { Column } from '../core/types.js';

export { XLSX_MIME };
export type { XlsxExporter, XlsxOptions, XlsxWriter } from '../core/export.js';

const WRITER_MODULE = 'write-excel-file/universal';

const MISSING_WRITER =
	"@chiwanpark/svelte-simple-datagrid: XLSX export requires the optional peer dependency 'write-excel-file'. Install it with `pnpm add write-excel-file`.";

export interface XlsxSheet {
	data: unknown[][];
	options: {
		sheet: string;
		columns: { width: number }[];
		stickyRowsCount?: number;
	};
}

export function sanitizeSheetName(name: string): string {
	const cleaned = name.replaceAll(/[[\]:*?/\\]/g, ' ').trim();
	return (cleaned || 'Sheet1').slice(0, 31);
}

function toSheetCell(cell: ExportCell, dateFormat: string) {
	if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
		return { value: cell.value, type: Number };
	}

	if (typeof cell.value === 'boolean') {
		return { value: cell.value, type: Boolean };
	}

	if (cell.value instanceof Date && !Number.isNaN(cell.value.getTime())) {
		return { value: cell.value, type: Date, format: dateFormat };
	}

	if (cell.text === '') return null;

	return { value: cell.text, type: String };
}

function columnWidths(header: string[], body: ExportCell[][]): { width: number }[] {
	const count = Math.max(header.length, body[0]?.length ?? 0);

	return Array.from({ length: count }, (_, index) => {
		let longest = header[index]?.length ?? 0;
		for (const line of body) longest = Math.max(longest, line[index]?.text.length ?? 0);
		return { width: Math.min(Math.max(longest + 2, 8), 60) };
	});
}

export function buildXlsxSheet<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	options: XlsxOptions<TRow> = {}
): XlsxSheet {
	const { header, body } = buildExportTable(rows, columns, options);
	const dateFormat = options.dateFormat ?? 'yyyy-mm-dd';
	const data: unknown[][] = [];

	if (header.length > 0) {
		data.push(header.map((text) => ({ value: text, type: String, fontWeight: 'bold' })));
	}

	for (const line of body) data.push(line.map((cell) => toSheetCell(cell, dateFormat)));

	return {
		data,
		options: {
			sheet: sanitizeSheetName(options.sheetName ?? 'Sheet1'),
			columns: columnWidths(header, body),
			...(header.length > 0 ? { stickyRowsCount: 1 } : {})
		}
	};
}

export async function loadXlsxWriter(): Promise<XlsxWriter> {
	try {
		const module = await import('write-excel-file/universal');
		return (module.default ?? module) as unknown as XlsxWriter;
	} catch (error) {
		throw new Error(`${MISSING_WRITER} (${WRITER_MODULE})`, { cause: error });
	}
}

export async function xlsxBlob<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	options: XlsxOptions<TRow> = {}
): Promise<Blob> {
	const writer = options.writer ?? (await loadXlsxWriter());
	const sheet = buildXlsxSheet(rows, columns, options);
	const blob = await writer(sheet.data, sheet.options).toBlob();

	return blob.type === XLSX_MIME ? blob : new Blob([blob], { type: XLSX_MIME });
}

export async function downloadXlsx<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	options: XlsxOptions<TRow> = {}
): Promise<void> {
	downloadBlob(await xlsxBlob(rows, columns, options), options.filename ?? 'export.xlsx');
}
