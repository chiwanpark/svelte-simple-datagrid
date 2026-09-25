import { formatCell } from './edit.js';
import type { Column, RowNumbersOptions } from './types.js';

export interface ExportCell {
	value: unknown;
	text: string;
}

export type ExportRowNumbers<TRow> = Pick<RowNumbersOptions<TRow>, 'header' | 'format'>;

export interface ExportOptions<TRow> {
	header?: boolean;
	columns?: Column<TRow>[];
	filename?: string;
	rowNumbers?: boolean | ExportRowNumbers<TRow>;
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
	const rowNumbers: ExportRowNumbers<TRow> | null = options.rowNumbers === true
		? {}
		: options.rowNumbers || null;

	const header = selected.map((column) => column.header);
	if (rowNumbers) header.unshift(rowNumbers.header ?? '');

	return {
		header: options.header === false ? [] : header,
		body: rows.map((row, index) => {
			const cells = selected.map((column) => {
				const value = column.value(row);
				return { value, text: formatCell(column, row, value) };
			});

			if (rowNumbers) {
				const rowNumber = index + 1;
				cells.unshift({
					value: rowNumber,
					text: rowNumbers.format ? rowNumbers.format(rowNumber, row) : String(rowNumber)
				});
			}

			return cells;
		})
	};
}
