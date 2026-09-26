import type { Snippet } from 'svelte';
import type { XlsxExporter } from './export.js';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
	columnId: string;
	direction: SortDirection;
}

export type ColumnAlign = 'left' | 'center' | 'right';

export type GridTheme = 'default' | 'spreadsheet';

export type EditorMove = 'up' | 'down' | 'left' | 'right' | null;

export interface SelectOptionObject {
	value: unknown;
	label?: string;
	disabled?: boolean;
}

export type SelectOption = SelectOptionObject | string | number | boolean;

export interface SelectOptionItem {
	value: unknown;
	label: string;
	disabled?: boolean;
}

export interface CellPosition {
	row: number;
	column: number;
}

export interface SelectionRect {
	top: number;
	left: number;
	bottom: number;
	right: number;
}

export interface CellContext<TRow> {
	row: TRow;
	rowIndex: number;
	value: unknown;
	text: string;
	column: Column<TRow>;
	focused: boolean;
	selected: boolean;
}

export interface EditorContext<TRow> {
	row: TRow;
	rowIndex: number;
	value: unknown;
	column: Column<TRow>;
	commit: (value: unknown) => void;
	cancel: () => void;
}

export interface HeaderContext<TRow> {
	column: Column<TRow>;
	sort: SortState | null;
}

export interface Column<TRow> {
	id: string;
	header: string;
	value: (row: TRow) => unknown;
	setValue?: (row: TRow, value: unknown) => TRow | void;
	format?: (value: unknown, row: TRow) => string;
	parse?: (text: string, row: TRow) => unknown;
	options?: SelectOption[] | ((row: TRow) => SelectOption[]);
	editable?: boolean;
	sortable?: boolean;
	resizable?: boolean;
	width?: string;
	minWidth?: number;
	align?: ColumnAlign;
	cell?: Snippet<[CellContext<TRow>]>;
	editor?: Snippet<[EditorContext<TRow>]>;
	headerCell?: Snippet<[HeaderContext<TRow>]>;
}

export interface ColumnResizeEvent {
	columnId: string;
	width: number;
}

export interface AutoSizeOptions {
	skipHeader?: boolean;
	maxWidth?: number;
}

export interface RowNumbersOptions<TRow> {
	header?: string;
	width?: string;
	format?: (rowNumber: number, row: TRow) => string;
	selectable?: boolean;
	includeInExport?: boolean;
}

export interface CellChange<TRow> {
	rowIndex: number;
	row: TRow;
	columnId: string;
	value: unknown;
	previousValue: unknown;
}

export interface FocusedCell {
	rowIndex: number;
	columnId: string;
}

export interface ContextMenuItem {
	id?: string;
	label?: string;
	disabled?: boolean;
	separator?: boolean;
	action?: () => void;
}

export interface ContextMenuContext<TRow> {
	row: TRow | null;
	rowIndex: number;
	column: Column<TRow> | null;
	selectedRows: TRow[];
	defaultItems: ContextMenuItem[];
}

export interface BottomBarContext {
	page: number;
	pageCount: number;
	pageSize: number;
	pageSizeOptions: number[];
	totalRows: number;
	rangeStart: number;
	rangeEnd: number;
	selectedCount: number;
	paginated: boolean;
	setPage: (page: number) => void;
	setPageSize: (pageSize: number) => void;
}

export interface DataGridProps<TRow> {
	rows: TRow[];
	columns: Column<TRow>[];
	rowKey?: (row: TRow, index: number) => string | number;
	rowNumbers?: boolean | RowNumbersOptions<TRow>;

	sort?: SortState | null;
	onsortchange?: (sort: SortState | null) => void;

	editable?: boolean;
	onchange?: (changes: CellChange<TRow>[]) => void;
	onfocuschange?: (cell: FocusedCell | null) => void;

	clipboard?: boolean;

	resizable?: boolean;
	columnWidths?: Record<string, number>;
	oncolumnresize?: (event: ColumnResizeEvent) => void;
	autoSize?: boolean | AutoSizeOptions;

	paginated?: boolean;
	page?: number;
	pageSize?: number;
	pageSizeOptions?: number[];
	onpagechange?: (page: number) => void;
	onpagesizechange?: (pageSize: number) => void;

	bottomBar?: boolean;
	bottomBarContent?: Snippet<[BottomBarContext]>;

	contextMenu?: boolean;
	contextMenuItems?: (context: ContextMenuContext<TRow>) => ContextMenuItem[];

	exportable?: boolean;
	exportFilename?: string;
	exportSheetName?: string;
	xlsxExporter?: XlsxExporter<TRow>;
	onexporterror?: (error: unknown) => void;

	emptyMessage?: string;
	height?: string;
	theme?: GridTheme;
	class?: string;
}
