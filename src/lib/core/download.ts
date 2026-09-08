import { toCsv, type CsvOptions } from './csv.js';
import type { Column } from './types.js';

export const CSV_MIME = 'text/csv;charset=utf-8';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface CsvDownloadOptions<TRow> extends CsvOptions<TRow> {
	bom?: boolean;
}

export function downloadBlob(blob: Blob, filename: string) {
	if (typeof document === 'undefined') return;

	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = filename;
	link.rel = 'noopener';
	link.style.display = 'none';

	document.body.append(link);
	link.click();
	link.remove();

	URL.revokeObjectURL(url);
}

export function csvBlob<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	options: CsvDownloadOptions<TRow> = {}
): Blob {
	const text = toCsv(rows, columns, options);
	return new Blob([options.bom === false ? text : `\ufeff${text}`], { type: CSV_MIME });
}

export function downloadCsv<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	options: CsvDownloadOptions<TRow> = {}
) {
	downloadBlob(csvBlob(rows, columns, options), options.filename ?? 'export.csv');
}
