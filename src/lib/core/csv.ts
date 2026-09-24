import { buildExportTable, type ExportOptions } from './export.js';
import type { Column } from './types.js';

export interface CsvOptions<TRow> extends ExportOptions<TRow> {
	delimiter?: string;
	newline?: string;
}

export function escapeCsvValue(text: string, delimiter = ','): string {
	const needsQuotes = text.includes(delimiter) ||
		text.includes('"') ||
		text.includes('\n') ||
		text.includes('\r') ||
		text.trim() !== text;

	return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	options: CsvOptions<TRow> = {}
): string {
	const { delimiter = ',', newline = '\r\n' } = options;
	const table = buildExportTable(rows, columns, options);

	const lines = table.body.map((line) =>
		line.map((cell) => escapeCsvValue(cell.text, delimiter)).join(delimiter)
	);

	if (table.header.length > 0) {
		lines.unshift(table.header.map((text) => escapeCsvValue(text, delimiter)).join(delimiter));
	}

	return lines.join(newline);
}
