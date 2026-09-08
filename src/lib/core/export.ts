import { formatCell } from './edit.js';
import type { Column } from './types.js';

export interface ExportCell {
	value: unknown;
	text: string;
}

export interface ExportOptions<TRow> {
	header?: boolean;
	columns?: Column<TRow>[];
	filename?: string;
}

export interface ExportTable {
	header: string[];
	body: ExportCell[][];
}

export interface XlsxWriterResult {
	toBlob: () => Promise<Blob>;
}

export type XlsxWriter = (
	data: unknown[][],
	sheetOptions?: Record<string, unknown>
) => XlsxWriterResult;

export interface XlsxOptions<TRow> extends ExportOptions<TRow> {
	sheetName?: string;
	dateFormat?: string;
	writer?: XlsxWriter;
}

export type XlsxExporter<TRow> = (
	rows: TRow[],
	columns: Column<TRow>[],
	options: XlsxOptions<TRow>
) => void | Promise<void>;

export function buildExportTable<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	options: ExportOptions<TRow> = {}
): ExportTable {
	const selected = options.columns ?? columns;

	return {
		header: options.header === false ? [] : selected.map((column) => column.header),
		body: rows.map((row) =>
			selected.map((column) => {
				const value = column.value(row);
				return { value, text: formatCell(column, row, value) };
			})
		)
	};
}
