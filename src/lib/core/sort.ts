import type { Column, SortState } from './types.js';

export interface RowEntry<TRow> {
	row: TRow;
	index: number;
}

export function compareValues(a: unknown, b: unknown): number {
	if (a === b) return 0;
	if (a === null || a === undefined) return 1;
	if (b === null || b === undefined) return -1;

	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
	if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

	return String(a).localeCompare(String(b));
}

export function sortEntries<TRow>(
	entries: RowEntry<TRow>[],
	columns: Column<TRow>[],
	sort: SortState | null | undefined
): RowEntry<TRow>[] {
	if (!sort) return entries;

	const column = columns.find((candidate) => candidate.id === sort.columnId);
	if (!column) return entries;

	const factor = sort.direction === 'desc' ? -1 : 1;
	return [...entries].sort(
		(a, b) => factor * compareValues(column.value(a.row), column.value(b.row))
	);
}

export function sortRows<TRow>(
	rows: TRow[],
	columns: Column<TRow>[],
	sort: SortState | null | undefined
): TRow[] {
	if (!sort) return rows;

	const entries = rows.map((row, index) => ({ row, index }));
	const sorted = sortEntries(entries, columns, sort);
	return sorted === entries ? rows : sorted.map((entry) => entry.row);
}

export function nextSortState(current: SortState | null | undefined, columnId: string) {
	if (!current || current.columnId !== columnId) {
		return { columnId, direction: 'asc' } as const;
	}
	if (current.direction === 'asc') {
		return { columnId, direction: 'desc' } as const;
	}
	return null;
}
