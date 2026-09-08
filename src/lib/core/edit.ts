import type { CellChange, Column, SelectOptionItem } from './types.js';

export function defaultFormat(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value);
}

export function formatCell<TRow>(column: Column<TRow>, row: TRow, value: unknown): string {
	return column.format ? column.format(value, row) : defaultFormat(value);
}

export function defaultParse(text: string, previousValue: unknown): unknown {
	if (typeof previousValue === 'number') {
		if (text.trim() === '') return null;
		const parsed = Number(text);
		return Number.isNaN(parsed) ? previousValue : parsed;
	}

	if (typeof previousValue === 'boolean') {
		return /^(true|1|y|yes)$/i.test(text.trim());
	}

	if (previousValue instanceof Date) {
		const parsed = new Date(text);
		return Number.isNaN(parsed.getTime()) ? previousValue : parsed;
	}

	return text;
}

export function normalizeOptions<TRow>(column: Column<TRow>, row: TRow): SelectOptionItem[] {
	const source =
		typeof column.options === 'function' ? column.options(row) : (column.options ?? []);

	return source.map((option) => {
		if (option !== null && typeof option === 'object') {
			return {
				value: option.value,
				label: option.label ?? formatCell(column, row, option.value),
				disabled: option.disabled
			};
		}
		return { value: option, label: formatCell(column, row, option) };
	});
}

export function parseCell<TRow>(
	column: Column<TRow>,
	row: TRow,
	text: string,
	previousValue: unknown
): unknown {
	if (column.parse) return column.parse(text, row);

	if (column.options) {
		const match = normalizeOptions(column, row).find(
			(option) => option.label === text || String(option.value) === text
		);
		return match ? match.value : previousValue;
	}

	return defaultParse(text, previousValue);
}

export function emptyValue(previousValue: unknown): unknown {
	if (typeof previousValue === 'string') return '';
	if (typeof previousValue === 'boolean') return false;
	return null;
}

export function isColumnEditable<TRow>(column: Column<TRow>, gridEditable: boolean): boolean {
	return column.editable ?? gridEditable;
}

function setColumnValue<TRow>(column: Column<TRow>, row: TRow, value: unknown): TRow {
	if (column.setValue) {
		const result = column.setValue(row, value);
		return (result ?? row) as TRow;
	}

	(row as Record<string, unknown>)[column.id] = value;
	return row;
}

export function applyCellChanges<TRow>(
	rows: TRow[],
	changes: CellChange<TRow>[],
	columns: Column<TRow>[]
): TRow[] {
	if (changes.length === 0) return rows;

	const next = [...rows];
	const touched = new Set<number>();

	for (const change of changes) {
		if (change.rowIndex < 0 || change.rowIndex >= next.length) continue;

		const column = columns.find((candidate) => candidate.id === change.columnId);
		if (!column) continue;

		if (!touched.has(change.rowIndex)) {
			const source = next[change.rowIndex];
			next[change.rowIndex] =
				source && typeof source === 'object' && !Array.isArray(source)
					? ({ ...source } as TRow)
					: source;
			touched.add(change.rowIndex);
		}

		next[change.rowIndex] = setColumnValue(column, next[change.rowIndex], change.value);
	}

	return next;
}
