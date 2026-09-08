export { default as DataGrid } from './DataGrid.svelte';
export { default as BottomBar } from './components/BottomBar.svelte';
export { default as CellEditor } from './components/CellEditor.svelte';
export { default as ContextMenu } from './components/ContextMenu.svelte';
export { default as Pagination } from './components/Pagination.svelte';
export { default as SelectEditor } from './components/SelectEditor.svelte';

export { expandMatrix, parseTsv, toTsv } from './core/clipboard.js';
export { escapeCsvValue, toCsv } from './core/csv.js';
export { csvBlob, CSV_MIME, downloadBlob, downloadCsv, XLSX_MIME } from './core/download.js';
export { buildExportTable } from './core/export.js';
export {
	applyCellChanges,
	defaultFormat,
	defaultParse,
	emptyValue,
	formatCell,
	isColumnEditable,
	normalizeOptions,
	parseCell
} from './core/edit.js';
export { clampPage, pageCount, pageNumbers, pageRange, paginate } from './core/pagination.js';
export {
	clampPosition,
	moveNextCell,
	movePosition,
	rectCellCount,
	rectContains,
	rectSize,
	toRect
} from './core/selection.js';
export { compareValues, nextSortState, sortEntries, sortRows } from './core/sort.js';

export type {
	BottomBarContext,
	CellChange,
	CellContext,
	CellPosition,
	Column,
	ColumnAlign,
	ColumnResizeEvent,
	ContextMenuContext,
	ContextMenuItem,
	DataGridProps,
	EditorContext,
	EditorMove,
	FocusedCell,
	GridTheme,
	HeaderContext,
	SelectionRect,
	SelectOption,
	SelectOptionItem,
	SelectOptionObject,
	SortDirection,
	SortState
} from './core/types.js';
export type { RowEntry } from './core/sort.js';
export type { CsvOptions } from './core/csv.js';
export type { CsvDownloadOptions } from './core/download.js';
export type {
	ExportCell,
	ExportOptions,
	ExportTable,
	XlsxExporter,
	XlsxOptions,
	XlsxWriter
} from './core/export.js';
