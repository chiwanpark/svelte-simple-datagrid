<script lang="ts">
	import {
		applyCellChanges,
		clampPage,
		DataGrid,
		downloadCsv,
		pageCount,
		Pagination,
		RowCount,
		SelectionCount,
		sortRows,
		type BottomBarContext,
		type CellChange,
		type Column,
		type ContextMenuItem,
		type FocusedCell,
		type GridTheme,
		type SortState
	} from '$lib/index.js';
	import { downloadXlsx } from '$lib/xlsx/index.js';

	interface Product {
		id: number;
		name: string;
		category: string;
		price: number;
		quantity: number;
		inStock: boolean;
	}

	const categories = ['Peripherals', 'Displays', 'Accessories', 'Audio'];

	function createRows(): Product[] {
		return Array.from({ length: 57 }, (_, index) => ({
			id: index + 1,
			name: `Product ${String(index + 1).padStart(2, '0')}`,
			category: categories[index % categories.length],
			price: Math.round((20 + index * 7.31) * 100) / 100,
			quantity: (index * 13) % 40,
			inStock: index % 3 !== 0
		}));
	}

	let rows = $state<Product[]>(createRows());

	let focused = $state<FocusedCell | null>(null);
	let log = $state<string[]>([]);
	let theme = $state<GridTheme>('spreadsheet');
	let bottomBarMode = $state<'default' | 'custom'>('default');
	let sort = $state<SortState | null>(null);

	let grid = $state<DataGrid<Product>>();
	let page = $state(1);
	let pageSize = $state(10);
	let targetPage = $state(1);
	let pageLog = $state<string[]>([]);
	let lastPage = $derived(pageCount(rows.length, pageSize));
	let currentPage = $derived(clampPage(page, rows.length, pageSize));
	let columnWidths = $state<Record<string, number>>({});

	const pageSizes = [5, 10, 25];

	const columns: Column<Product>[] = [
		{
			id: 'id',
			header: 'ID',
			value: (row) => row.id,
			sortable: true,
			align: 'right',
			width: '4rem',
			editable: false
		},
		{ id: 'name', header: 'Name', value: (row) => row.name, sortable: true },
		{
			id: 'category',
			header: 'Category',
			value: (row) => row.category,
			options: categories,
			sortable: true
		},
		{
			id: 'price',
			header: 'Price',
			value: (row) => row.price,
			format: (value) => `$${(value as number).toFixed(2)}`,
			sortable: true,
			align: 'right',
			width: '7rem'
		},
		{
			id: 'quantity',
			header: 'Qty',
			value: (row) => row.quantity,
			sortable: true,
			align: 'right',
			width: '5rem'
		},
		{
			id: 'inStock',
			header: 'In Stock',
			value: (row) => row.inStock,
			options: [true, false],
			format: (value) => (value ? 'Yes' : 'No'),
			sortable: true,
			width: '7rem',
			cell: stockCell
		}
	];

	function handleChange(changes: CellChange<Product>[]) {
		rows = applyCellChanges(rows, changes, columns);
		log = [
			...changes.map(
				(change) =>
					`${change.columnId}#${change.rowIndex}: ${change.previousValue} → ${change.value}`
			),
			...log
		].slice(0, 6);
	}

	function resetRows() {
		rows = createRows();
		log = [];
	}

	async function download(format: 'csv' | 'xlsx') {
		const sorted = sortRows(rows, columns, sort);

		if (format === 'csv') {
			downloadCsv(sorted, columns, { filename: 'products.csv' });
		} else {
			await downloadXlsx(sorted, columns, { filename: 'products.xlsx', sheetName: 'Products' });
		}
	}

	function logPage(entry: string) {
		pageLog = [entry, ...pageLog].slice(0, 6);
	}

	function goToPage(event: SubmitEvent) {
		event.preventDefault();
		grid?.setPage(targetPage);
	}

	function menuItems({
		row,
		defaultItems
	}: {
		row: Product | null;
		defaultItems: ContextMenuItem[];
	}): ContextMenuItem[] {
		if (!row) return defaultItems;

		return [
			...defaultItems,
			{ id: 'custom-separator', separator: true },
			{
				id: 'toggle-stock',
				label: row.inStock ? 'Mark as out of stock' : 'Mark as in stock',
				action: () => {
					rows = rows.map((item) =>
						item.id === row.id ? { ...item, inStock: !item.inStock } : item
					);
				}
			},
			{
				id: 'delete',
				label: `Delete ${row.name}`,
				action: () => {
					rows = rows.filter((item) => item.id !== row.id);
				}
			}
		];
	}
</script>

{#snippet stockCell({ value }: { value: unknown })}
	<span class="badge" class:badge-on={value === true}>{value ? 'In stock' : 'Out'}</span>
{/snippet}

{#snippet customBottomBar(context: BottomBarContext)}
	<Pagination page={context.page} pageCount={context.pageCount} onpage={context.setPage} />
	<button type="button" class="bar-button" onclick={resetRows}>Reset data</button>
	<div class="bar-info">
		<RowCount {context} />
		<SelectionCount {context} />
	</div>
{/snippet}

<main>
	<h1>@chiwanpark/svelte-simple-datagrid</h1>
	<p class="hint">
		Category and stock cells use the select editor. Click a cell to focus, drag or shift+arrows to
		select, Enter/F2 or double click to edit, Ctrl/Cmd+C / Ctrl/Cmd+V to copy &amp; paste, Delete to
		clear, right click for the context menu. Click or drag row numbers to select whole rows. Drag a
		header edge to resize a column, or double click it to fit the content. Name and Category have no
		width, so <code>autoSize</code> fits them to their content. The toolbars drive the grid through
		its exported <code>setPage</code>, <code>setPageSize</code> and <code>autoSizeColumns</code>
		methods.
	</p>

	<div class="toolbar">
		<div class="option-group">
			<span>Theme</span>
			{#each ['default', 'spreadsheet'] as const as option (option)}
				<label>
					<input type="radio" name="theme" value={option} bind:group={theme} />
					{option}
				</label>
			{/each}
		</div>

		<div class="option-group">
			<span>Bottom bar</span>
			{#each ['default', 'custom'] as const as option (option)}
				<label>
					<input type="radio" name="bottom-bar" value={option} bind:group={bottomBarMode} />
					{option}
				</label>
			{/each}
		</div>

		<button type="button" onclick={() => download('csv')}>Download CSV</button>
		<button type="button" onclick={() => download('xlsx')}>Download XLSX</button>
	</div>

	<div class="toolbar">
		<span>Pagination API</span>
		<button type="button" onclick={() => grid?.setPage(1)} disabled={currentPage <= 1}>
			First
		</button>
		<button
			type="button"
			onclick={() => grid?.setPage(currentPage - 1)}
			disabled={currentPage <= 1}
		>
			Previous
		</button>
		<button
			type="button"
			onclick={() => grid?.setPage(currentPage + 1)}
			disabled={currentPage >= lastPage}
		>
			Next
		</button>
		<button
			type="button"
			onclick={() => grid?.setPage(lastPage)}
			disabled={currentPage >= lastPage}
		>
			Last
		</button>

		<form onsubmit={goToPage}>
			<label>
				Page
				<input type="number" min="1" max={lastPage} bind:value={targetPage} />
			</label>
			<button type="submit">Go</button>
		</form>

		{#each pageSizes as size (size)}
			<button
				type="button"
				class:active={pageSize === size}
				aria-pressed={pageSize === size}
				onclick={() => grid?.setPageSize(size)}
			>
				{size} rows
			</button>
		{/each}

		<span class="page-status">Page {currentPage} of {lastPage}</span>
	</div>

	<div class="toolbar">
		<span>Column sizing API</span>
		<button type="button" onclick={() => grid?.autoSizeColumns()}>Fit all columns</button>
		<button type="button" onclick={() => grid?.autoSizeColumns(undefined, { skipHeader: true })}>
			Fit to cells only
		</button>
		<button type="button" onclick={() => grid?.autoSizeColumns(['name'], { maxWidth: 80 })}>
			Fit Name, max 80px
		</button>
		<button type="button" onclick={() => (columnWidths = {})}>Reset widths</button>
	</div>

	<DataGrid
		bind:this={grid}
		{rows}
		{columns}
		{theme}
		bind:sort
		rowKey={(row) => row.id}
		rowNumbers={{ includeInExport: true }}
		editable
		exportable
		exportFilename="products"
		xlsxExporter={downloadXlsx}
		paginated
		bind:page
		bind:pageSize
		height="24rem"
		bind:columnWidths
		autoSize
		onchange={handleChange}
		onfocuschange={(cell) => (focused = cell)}
		onpagechange={(next) => logPage(`onpagechange(${next})`)}
		onpagesizechange={(next) => logPage(`onpagesizechange(${next})`)}
		contextMenuItems={menuItems}
		bottomBarContent={bottomBarMode === 'custom' ? customBottomBar : undefined}
	/>

	<section class="status">
		<div>
			<h2>Focused cell</h2>
			<p>{focused ? `row ${focused.rowIndex}, column "${focused.columnId}"` : 'none'}</p>
		</div>
		<div>
			<h2>Recent changes</h2>
			{#if log.length === 0}
				<p>none</p>
			{:else}
				<ul>
					{#each log as entry, index (`${entry}-${index}`)}
						<li>{entry}</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div>
			<h2>Pagination events</h2>
			{#if pageLog.length === 0}
				<p>none</p>
			{:else}
				<ul>
					{#each pageLog as entry, index (`${entry}-${index}`)}
						<li>{entry}</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div>
			<h2>Column widths</h2>
			{#if Object.keys(columnWidths).length === 0}
				<p>none</p>
			{:else}
				<ul>
					{#each Object.entries(columnWidths) as [id, width] (id)}
						<li>{id}: {width}px</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
</main>

<style>
	main {
		max-width: 60rem;
		margin: 2rem auto;
		padding: 0 1rem;
		color: #0f172a;
		font-family: system-ui, sans-serif;
	}

	.hint {
		color: #64748b;
		font-size: 0.875rem;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		margin-bottom: 0.5rem;
		color: #475569;
		font-size: 0.875rem;
	}

	.option-group,
	.toolbar label,
	.toolbar form {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.option-group {
		gap: 0.75rem;
		margin-right: 0.5rem;
	}

	.toolbar input[type='number'] {
		width: 3.5rem;
		padding: 0.2rem 0.375rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.25rem;
		font: inherit;
	}

	.toolbar button {
		padding: 0.25rem 0.625rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.25rem;
		background: #fff;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.toolbar button:disabled {
		color: #94a3b8;
		cursor: default;
	}

	.toolbar button.active {
		border-color: #2563eb;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.page-status {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}

	.bar-button {
		height: 1.75rem;
		padding: 0 0.625rem;
		border: 1px solid var(--ssdg-border-color, #e2e8f0);
		border-radius: 0.25rem;
		background: var(--ssdg-menu-bg, #fff);
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.bar-button:hover {
		background: var(--ssdg-menu-hover-bg, #f1f5f9);
	}

	.bar-info {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.75rem;
	}

	.badge {
		display: inline-block;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: #f1f5f9;
		color: #64748b;
		font-size: 0.75rem;
	}

	.badge-on {
		background: #dcfce7;
		color: #15803d;
	}

	.status {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
		font-size: 0.875rem;
	}

	.status h2 {
		margin: 0 0 0.25rem;
		font-size: 0.875rem;
	}

	.status ul {
		margin: 0;
		padding-left: 1rem;
		color: #475569;
	}
</style>
