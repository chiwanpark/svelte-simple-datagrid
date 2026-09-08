# @chiwanpark/svelte-simple-datagrid

A simple, lightweight datagrid component for Svelte 5, written in TypeScript.

- Cell focus, range selection and keyboard navigation
- Inline editing with text and select editors, plus custom editors
- Clipboard copy / cut / paste using TSV (Excel & Sheets compatible)
- Custom rendering through snippets and `format` hooks
- Client-side sorting and pagination
- Drag to resize columns, with keyboard resizing and double-click auto-fit
- Bottom bar with row counts, page size selector and pager
- Context menu with default clipboard actions and custom items
- CSV download built in, XLSX download through the optional `write-excel-file` peer dependency
- Themeable through CSS custom properties, including a built-in `spreadsheet` theme

## Installation

```sh
pnpm add @chiwanpark/svelte-simple-datagrid
```

## Usage

```svelte
<script lang="ts">
	import {
		applyCellChanges,
		DataGrid,
		type CellChange,
		type Column
	} from '@chiwanpark/svelte-simple-datagrid';

	interface Person {
		id: number;
		name: string;
		age: number;
	}

	let rows = $state<Person[]>([
		{ id: 1, name: 'Alice', age: 30 },
		{ id: 2, name: 'Bob', age: 35 }
	]);

	const columns: Column<Person>[] = [
		{ id: 'name', header: 'Name', value: (row) => row.name, sortable: true },
		{ id: 'age', header: 'Age', value: (row) => row.age, sortable: true, align: 'right' }
	];

	function handleChange(changes: CellChange<Person>[]) {
		rows = applyCellChanges(rows, changes, columns);
	}
</script>

<DataGrid
	{rows}
	{columns}
	rowKey={(row) => row.id}
	editable
	paginated
	pageSize={10}
	onchange={handleChange}
/>
```

The grid never mutates `rows`. Every edit, paste, cut or clear is reported through `onchange` as a list of `CellChange` objects, so the parent stays the single source of truth. `applyCellChanges` is a helper that applies them immutably.

## Props

| Prop               | Type                                            | Default             | Description                                                       |
| ------------------ | ----------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| `rows`             | `TRow[]`                                        | required            | Data rows.                                                        |
| `columns`          | `Column<TRow>[]`                                | required            | Column definitions.                                               |
| `rowKey`           | `(row, index) => string \| number`              | row index           | Stable key per row.                                               |
| `sort`             | `SortState \| null` (bindable)                  | `null`              | Active sort.                                                      |
| `onsortchange`     | `(sort) => void`                                | –                   | Called when the sort changes.                                     |
| `editable`         | `boolean`                                       | `false`             | Enables editing, paste, cut and clear.                            |
| `onchange`         | `(changes: CellChange<TRow>[]) => void`         | –                   | Called with every batch of cell changes.                          |
| `onfocuschange`    | `(cell: FocusedCell \| null) => void`           | –                   | Called when the focused cell changes.                             |
| `clipboard`        | `boolean`                                       | `true`              | Enables copy / cut / paste.                                       |
| `resizable`        | `boolean`                                       | `true`              | Enables column resize handles.                                    |
| `columnWidths`     | `Record<string, number>` (bindable)             | `{}`                | Resized widths in px, keyed by column id.                         |
| `oncolumnresize`   | `(event: ColumnResizeEvent) => void`            | –                   | Called after a column is resized.                                 |
| `paginated`        | `boolean`                                       | `false`             | Enables client-side pagination.                                   |
| `page`             | `number` (bindable)                             | `1`                 | Current page, 1-based.                                            |
| `pageSize`         | `number` (bindable)                             | `20`                | Rows per page.                                                    |
| `pageSizeOptions`  | `number[]`                                      | `[10, 20, 50, 100]` | Options in the page size selector.                                |
| `onpagechange`     | `(page: number) => void`                        | –                   | Called when the page changes.                                     |
| `onpagesizechange` | `(pageSize: number) => void`                    | –                   | Called when the page size changes.                                |
| `bottomBar`        | `boolean`                                       | `paginated`         | Shows the bottom bar. Set `false` to hide it even when paginated. |
| `bottomBarContent` | `Snippet<[BottomBarContext]>`                   | –                   | Replaces the bottom bar content.                                  |
| `contextMenu`      | `boolean`                                       | `true`              | Enables the right click menu.                                     |
| `contextMenuItems` | `(context: ContextMenuContext<TRow>) => Item[]` | –                   | Customizes the menu items.                                        |
| `exportable`       | `boolean`                                       | `false`             | Adds export entries to the context menu.                          |
| `exportFilename`   | `string`                                        | `'export'`          | Base name for exported files.                                     |
| `exportSheetName`  | `string`                                        | `exportFilename`    | Worksheet name used for XLSX.                                     |
| `xlsxExporter`     | `XlsxExporter<TRow>`                            | –                   | Enables the Export XLSX entry, e.g. `downloadXlsx`.               |
| `onexporterror`    | `(error: unknown) => void`                      | –                   | Called when an export rejects.                                    |
| `emptyMessage`     | `string`                                        | `'No data'`         | Shown when there are no rows.                                     |
| `height`           | `string`                                        | –                   | Fixed viewport height, e.g. `"24rem"`.                            |
| `theme`            | `'default' \| 'spreadsheet'`                    | `'default'`         | Built-in theme.                                                   |
| `class`            | `string`                                        | `''`                | Extra class on the wrapper.                                       |

## Columns

```ts
interface Column<TRow> {
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
	align?: 'left' | 'center' | 'right';
	cell?: Snippet<[CellContext<TRow>]>;
	editor?: Snippet<[EditorContext<TRow>]>;
	headerCell?: Snippet<[HeaderContext<TRow>]>;
}
```

- `format` controls the displayed text and the clipboard output.
- `parse` converts pasted or typed text back into a value. Without it, the previous value type is used to guess (number, boolean, date, string).
- `width` is any CSS width used as the initial size; `minWidth` (px, default `40`) limits shrinking while resizing.
- `resizable` overrides the grid-level `resizable` per column.
- `options` turns the column into a categorical column edited with a select box.
- `setValue` is used by `applyCellChanges`; the default writes to the property named after `column.id`.
- `editable` overrides the grid-level `editable` per column.

### Select editor

Columns with `options` are edited with a dropdown instead of a text input:

```ts
const columns: Column<Person>[] = [
	{ id: 'category', header: 'Category', value: (row) => row.category, options: ['A', 'B', 'C'] },
	{
		id: 'role',
		header: 'Role',
		value: (row) => row.role,
		options: [
			{ value: 'admin', label: 'Administrator' },
			{ value: 'user', label: 'User' },
			{ value: 'guest', label: 'Guest', disabled: true }
		]
	},
	{
		id: 'inStock',
		header: 'In stock',
		value: (row) => row.inStock,
		format: (value) => (value ? 'Yes' : 'No'),
		options: [true, false]
	}
];
```

- Options may be primitives, `{ value, label?, disabled? }` objects, or a function of the row.
- A missing `label` falls back to `column.format`, so the cell and the dropdown always agree.
- Picking an option commits immediately; Enter commits and moves down, Tab commits and moves sideways, Escape cancels.
- Pasted or typed text is matched against option labels and values; anything else is rejected, so categorical columns keep valid values. Provide `parse` to override this.

### Custom rendering

```svelte
{#snippet stock({ value }: { value: unknown })}
	<span class="badge">{value ? 'In stock' : 'Out'}</span>
{/snippet}

<DataGrid rows={rows} columns={[{ id: 'inStock', header: 'Stock', value: (r) => r.inStock, cell: stock }]} />
```

`cell` receives `{ row, rowIndex, value, text, column, focused, selected }`, `headerCell` receives `{ column, sort }`, and `editor` receives `{ row, rowIndex, value, column, commit, cancel }`.

## Column resizing

Drag the right edge of a header to resize a column, double click it to fit the widest visible cell, or focus the handle and use the arrow keys (Shift for larger steps).

Widths live in `columnWidths`, keyed by column id, so they can be persisted or restored:

```svelte
<script lang="ts">
	let columnWidths = $state<Record<string, number>>({ name: 220 });
</script>

<DataGrid {rows} {columns} bind:columnWidths oncolumnresize={(event) => save(event)} />
```

The table uses a fixed layout with a trailing spacer column, so resized widths are exact: leftover space stays empty instead of being spread across the columns, and the grid scrolls horizontally once the columns are wider than the viewport. Columns without a `width` share the available space equally.

## Keyboard

| Keys                         | Action                                      |
| ---------------------------- | ------------------------------------------- |
| Arrows                       | Move the focused cell                       |
| Shift + Arrows               | Extend the selection                        |
| Ctrl/Cmd + Arrows            | Jump to the edge                            |
| Tab / Shift + Tab            | Move to the next / previous cell            |
| Home / End                   | First / last column (with Ctrl/Cmd: grid)   |
| PageUp / PageDown            | Previous / next page (or jump 10 rows)      |
| Enter / F2 / printable key   | Start editing (dropdown for option columns) |
| Enter / Tab inside an editor | Commit and move                             |
| Escape                       | Cancel editing, collapse the selection      |
| Delete / Backspace           | Clear the selected cells                    |
| Ctrl/Cmd + A                 | Select all cells                            |
| Ctrl/Cmd + C / X / V         | Copy / cut / paste                          |

## Bottom bar

The bottom bar follows `paginated` by default, so it appears with pagination and stays hidden without it. Set `bottomBar` explicitly to override:

```svelte
<DataGrid {rows} {columns} paginated bottomBar={false} />
<DataGrid {rows} {columns} bottomBar />
```

Hiding it does not disable pagination: rows are still paged, PageUp / PageDown still switch pages, and you can drive `page` yourself with `bind:page` or `onpagechange`.

```svelte
<DataGrid {rows} {columns} paginated bottomBar={false} bind:page />
```

The bar is responsive: it uses container queries on the grid itself, not on the viewport, so it adapts whenever the grid is narrow. Below `30rem` the counts and the controls stack into two rows, below `26rem` the pager collapses to `‹ 3 / 6 ›`, and below `20rem` the first/last buttons are dropped and the remaining controls grow for touch.

Use `bottomBarContent` to keep the bar but replace its content:

```svelte
<DataGrid {rows} {columns} paginated bottomBarContent={footer} />

{#snippet footer({ totalRows, page, pageCount, setPage })}
	<span>{totalRows} rows</span>
	<button onclick={() => setPage(page + 1)} disabled={page >= pageCount}>Next</button>
{/snippet}
```

## Clipboard

Copy writes the selection as TSV, so it can be pasted straight into Excel or Google Sheets. Pasting a single value fills the whole selection; pasting a block starts at the top-left cell of the selection and is clipped to the grid. Only editable columns are written.

## Export

CSV export is built in. XLSX export is delegated to [`write-excel-file`](https://www.npmjs.com/package/write-excel-file), declared as an **optional peer dependency**, so install it only if you need it:

```sh
pnpm add write-excel-file
```

```svelte
<script lang="ts">
	import {
		DataGrid,
		downloadCsv,
		sortRows,
		type SortState
	} from '@chiwanpark/svelte-simple-datagrid';
	import { downloadXlsx } from '@chiwanpark/svelte-simple-datagrid/xlsx';

	let sort = $state<SortState | null>(null);

	async function download(format: 'csv' | 'xlsx') {
		const sorted = sortRows(rows, columns, sort);

		if (format === 'csv') downloadCsv(sorted, columns, { filename: 'products.csv' });
		else await downloadXlsx(sorted, columns, { filename: 'products.xlsx', sheetName: 'Products' });
	}
</script>

<button onclick={() => download('csv')}>Download CSV</button>
<button onclick={() => download('xlsx')}>Download XLSX</button>

<DataGrid
	{rows}
	{columns}
	bind:sort
	exportable
	exportFilename="products"
	xlsxExporter={downloadXlsx}
/>
```

XLSX lives behind the `@chiwanpark/svelte-simple-datagrid/xlsx` subpath so that apps which never import it are not asked to resolve `write-excel-file` at build time. For the same reason the grid does not import it either: pass `xlsxExporter` and the context menu gains an Export XLSX entry next to Export CSV. Without it, only Export CSV is shown.

With `exportable`, the menu exports every row in the current sort order, not just the current page. Async failures (for example a missing `write-excel-file`) are reported through `onexporterror`, and rethrown when no handler is given.

### Functions

| Function                                    | Result                                                |
| ------------------------------------------- | ----------------------------------------------------- |
| `toCsv(rows, columns, options?)`            | CSV string (RFC 4180 quoting, CRLF by default)        |
| `csvBlob` / `downloadCsv`                   | `Blob` / browser download                             |
| `xlsxBlob(rows, columns, options?)`         | `Promise<Blob>` of an `.xlsx` workbook                |
| `downloadXlsx(rows, columns, options?)`     | `Promise<void>`, triggers a browser download          |
| `buildXlsxSheet(rows, columns, options?)`   | `{ data, options }` for `write-excel-file` (pure)     |
| `loadXlsxWriter()`                          | Resolves the optional writer, or throws a clear error |
| `downloadBlob(blob, filename)`              | Downloads any blob                                    |
| `buildExportTable(rows, columns, options?)` | `{ header, body }` with raw values and cell text      |

Shared options: `header` (default `true`), `columns` (subset or custom order), `filename`. CSV adds `delimiter`, `newline` and `bom` (a UTF-8 BOM is written by default so Excel opens accented text correctly). XLSX adds `sheetName`, `dateFormat` (default `yyyy-mm-dd`) and `writer` to inject an already imported `write-excel-file`.

Cell values follow the column definition: `format` decides the exported text, so a formatted price stays formatted. In XLSX, numbers, booleans and dates become real typed cells (dates as Excel serial numbers with a date format), everything else is written as text, the header row is bold and frozen, and column widths are derived from the content.

`toCsv`, `buildExportTable` and `buildXlsxSheet` are pure, so they also run on the server; `downloadBlob` is a no-op without a `document`.

## Context menu

Right clicking a cell opens a menu with `Copy`, `Cut`, `Paste`, `Clear` and `Select all` (depending on `clipboard` and `editable`). Use `contextMenuItems` to extend or replace them:

```svelte
<DataGrid
	{rows}
	{columns}
	contextMenuItems={({ row, defaultItems }) => [
		...defaultItems,
		{ id: 'sep', separator: true },
		{ id: 'delete', label: `Delete ${row?.name}`, action: () => remove(row) }
	]}
/>
```

## Theming

```svelte
<DataGrid {rows} {columns} theme="spreadsheet" />
```

- `default` — compact, light and neutral.
- `spreadsheet` — a spreadsheet look borrowed from AG Grid's Balham theme: 12px system font, 28px rows, a 32px header, `#bdc3c7` borders, `#f5f7f7` header, `#fcfdfe` zebra rows, `#0091ea` focus and selection, and an 8% accent row hover (`rgb(0 145 234 / 8%)`), matching Balham's current `rowHoverColor: accentMix(0.08)`. The older Balham CSS used a grey `#ecf0f1` hover instead; set `--ssdg-hover-bg: #ecf0f1` to get it back.

Row hover and cell selection are painted as translucent layers over the row background, like AG Grid, so a selected cell in a hovered row blends both instead of dropping one.

A theme is just a `ssdg-theme-<name>` class on the wrapper that assigns CSS custom properties, so it can be tweaked or replaced without touching the component.

### CSS custom properties

| Property                     | Default                | Applies to                         |
| ---------------------------- | ---------------------- | ---------------------------------- |
| `--ssdg-bg`                  | `#fff`                 | Grid background                    |
| `--ssdg-color`               | `#0f172a`              | Text colour                        |
| `--ssdg-border-color`        | `#e2e8f0`              | Outer border, cell borders         |
| `--ssdg-row-border-color`    | `--ssdg-border-color`  | Horizontal cell borders            |
| `--ssdg-header-border-color` | `--ssdg-border-color`  | Header column separators           |
| `--ssdg-header-bg`           | `#f8fafc`              | Header background                  |
| `--ssdg-header-color`        | `inherit`              | Header text colour                 |
| `--ssdg-header-height`       | `--ssdg-row-height`    | Header height                      |
| `--ssdg-row-height`          | `2rem`                 | Body row height                    |
| `--ssdg-stripe-bg`           | `transparent`          | Zebra striping (even rows)         |
| `--ssdg-hover-bg`            | `transparent`          | Row hover background               |
| `--ssdg-selection-bg`        | `rgb(37 99 235 / 10%)` | Selected cells                     |
| `--ssdg-accent-color`        | `#2563eb`              | Focus outline, active page button  |
| `--ssdg-focus-width`         | `2px`                  | Focus outline width                |
| `--ssdg-cell-padding`        | `0.5rem`               | Cell and editor horizontal padding |
| `--ssdg-font-family`         | `inherit`              | Grid font                          |
| `--ssdg-font-size`           | `0.875rem`             | Grid font size                     |
| `--ssdg-radius`              | `0.375rem`             | Wrapper corner radius              |
| `--ssdg-muted-color`         | `#64748b`              | Secondary text, disabled items     |
| `--ssdg-bottom-bar-bg`       | `#f8fafc`              | Bottom bar background              |
| `--ssdg-menu-bg`             | `#fff`                 | Context menu background            |
| `--ssdg-menu-hover-bg`       | `#f1f5f9`              | Context menu and pager hover       |
| `--ssdg-editor-bg`           | `--ssdg-bg`            | Cell editor background             |

`--ssdg-cell-padding` is shared by cells and the built-in editors, so the text does not shift when a cell enters edit mode.

```css
:global(.ssdg-theme-spreadsheet) {
	--ssdg-accent-color: #16a34a;
	--ssdg-row-height: 24px;
}
```

## Development

```sh
pnpm install
pnpm dev          # demo app in src/routes
pnpm test         # unit tests (node) and component tests (jsdom)
pnpm check        # svelte-check + TypeScript
pnpm lint         # prettier + eslint
pnpm build        # build the demo app and package the library
pnpm changeset    # record a version bump for your change
```

The library lives in `src/lib`; `src/routes` is a showcase app that is not published.

Releases are automated with Changesets and published from GitHub Actions; see [RELEASING.md](RELEASING.md).

## License

MIT
