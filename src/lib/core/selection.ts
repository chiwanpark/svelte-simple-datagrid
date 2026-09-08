import type { CellPosition, SelectionRect } from './types.js';

export function toRect(
	anchor: CellPosition | null | undefined,
	focus: CellPosition | null | undefined
): SelectionRect | null {
	if (!focus) return null;
	const start = anchor ?? focus;

	return {
		top: Math.min(start.row, focus.row),
		left: Math.min(start.column, focus.column),
		bottom: Math.max(start.row, focus.row),
		right: Math.max(start.column, focus.column)
	};
}

export function rectContains(rect: SelectionRect | null, row: number, column: number): boolean {
	if (!rect) return false;
	return row >= rect.top && row <= rect.bottom && column >= rect.left && column <= rect.right;
}

export function rectSize(rect: SelectionRect | null): { rows: number; columns: number } {
	if (!rect) return { rows: 0, columns: 0 };
	return { rows: rect.bottom - rect.top + 1, columns: rect.right - rect.left + 1 };
}

export function rectCellCount(rect: SelectionRect | null): number {
	const { rows, columns } = rectSize(rect);
	return rows * columns;
}

export function clampPosition(
	position: CellPosition,
	rowCount: number,
	columnCount: number
): CellPosition | null {
	if (rowCount <= 0 || columnCount <= 0) return null;

	return {
		row: Math.min(Math.max(position.row, 0), rowCount - 1),
		column: Math.min(Math.max(position.column, 0), columnCount - 1)
	};
}

export function movePosition(
	position: CellPosition,
	rowDelta: number,
	columnDelta: number,
	rowCount: number,
	columnCount: number
): CellPosition | null {
	return clampPosition(
		{ row: position.row + rowDelta, column: position.column + columnDelta },
		rowCount,
		columnCount
	);
}

export function moveNextCell(
	position: CellPosition,
	direction: 1 | -1,
	rowCount: number,
	columnCount: number
): CellPosition | null {
	if (rowCount <= 0 || columnCount <= 0) return null;

	let { row, column } = position;
	column += direction;

	if (column >= columnCount) {
		column = 0;
		row += 1;
	} else if (column < 0) {
		column = columnCount - 1;
		row -= 1;
	}

	if (row < 0 || row >= rowCount) return null;
	return { row, column };
}
