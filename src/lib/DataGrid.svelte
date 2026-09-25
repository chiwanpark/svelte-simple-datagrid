<script lang="ts" generics="TRow">
	import { tick } from 'svelte';
	import BottomBar from './components/BottomBar.svelte';
	import CellEditor from './components/CellEditor.svelte';
	import ContextMenu from './components/ContextMenu.svelte';
	import SelectEditor from './components/SelectEditor.svelte';
	import { expandMatrix, parseTsv, toTsv } from './core/clipboard.js';
	import { downloadCsv } from './core/download.js';
	import {
		emptyValue,
		formatCell,
		isColumnEditable,
		normalizeOptions,
		parseCell
	} from './core/edit.js';
	import { clampPage, pageCount, pageRange, paginate } from './core/pagination.js';
	import {
		clampPosition,
		moveNextCell,
		movePosition,
		rectCellCount,
		rectContains,
		rectSize,
		toRect
	} from './core/selection.js';
	import { nextSortState, sortEntries } from './core/sort.js';
	import type {
		BottomBarContext,
		CellChange,
		CellPosition,
		Column,
		ContextMenuItem,
		DataGridProps,
		EditorMove,
		RowNumbersOptions,
		SelectionRect
	} from './core/types.js';

	let {
		rows,
		columns,
		rowKey = (_row: TRow, index: number) => index,
		rowNumbers = false,
		sort = $bindable(null),
		onsortchange,
		editable = false,
		onchange,
		onfocuschange,
		clipboard = true,
		resizable = true,
		columnWidths = $bindable({}),
		oncolumnresize,
		paginated = false,
		page = $bindable(1),
		pageSize = $bindable(20),
		pageSizeOptions = [10, 20, 50, 100],
		onpagechange,
		onpagesizechange,
		bottomBar,
		bottomBarContent,
		contextMenu = true,
		contextMenuItems,
		exportable = false,
		exportFilename = 'export',
		exportSheetName,
		xlsxExporter,
		onexporterror,
		emptyMessage = 'No data',
		height,
		theme = 'default',
		class: className = ''
	}: DataGridProps<TRow> = $props();

	let focus = $state.raw<CellPosition | null>(null);
	let anchor = $state.raw<CellPosition | null>(null);
	let editing = $state.raw<{ position: CellPosition; text: string } | null>(null);
	let menu = $state.raw<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
	let table = $state<HTMLTableElement | null>(null);
	let resizing = $state.raw<{ columnId: string; startX: number; startWidth: number } | null>(null);
	let dragging: 'cells' | 'rows' | null = null;

	let entries = $derived(rows.map((row, index) => ({ row, index })));
	let sortedEntries = $derived(sortEntries(entries, columns, sort));
	let totalRows = $derived(sortedEntries.length);
	let currentPageCount = $derived(paginated ? pageCount(totalRows, pageSize) : 1);
	let currentPage = $derived(paginated ? clampPage(page, totalRows, pageSize) : 1);
	let viewEntries = $derived(
		paginated ? paginate(sortedEntries, currentPage, pageSize) : sortedEntries
	);
	let visibleRange = $derived(pageRange(currentPage, totalRows, paginated ? pageSize : 0));

	let selection = $derived(toRect(anchor, focus));
	let showBottomBar = $derived(bottomBar ?? paginated);

	let rowNumberOptions = $derived<RowNumbersOptions<TRow> | null>(
		rowNumbers === true ? {} : rowNumbers || null
	);
	let rowNumbersSelectable = $derived(rowNumberOptions?.selectable ?? true);
	let rowNumberWidth = $derived(
		rowNumberOptions?.width ??
			`calc(${Math.max(String(totalRows).length, 2)}ch + 2 * var(--ssdg-cell-padding) + 1px)`
	);

	let focusedCell = $derived.by(() => {
		if (!focus) return null;
		const entry = viewEntries[focus.row];
		const column = columns[focus.column];
		if (!entry || !column) return null;
		return { rowIndex: entry.index, columnId: column.id };
	});

	let bottomBarContext = $derived<BottomBarContext>({
		page: currentPage,
		pageCount: currentPageCount,
		pageSize,
		pageSizeOptions: pageSizeOptions.includes(pageSize)
			? pageSizeOptions
			: [...pageSizeOptions, pageSize].sort((a, b) => a - b),
		totalRows,
		rangeStart: visibleRange.start,
		rangeEnd: visibleRange.end,
		selectedCount: rectCellCount(selection),
		paginated,
		setPage,
		setPageSize
	});

	$effect(() => {
		onfocuschange?.(focusedCell);
	});

	$effect(() => {
		const position = focus;
		if (!position) return;

		const clamped = clampPosition(position, viewEntries.length, columns.length);
		if (!clamped) {
			focus = null;
			anchor = null;
		} else if (clamped.row !== position.row || clamped.column !== position.column) {
			focus = clamped;
			anchor = clamped;
		}
	});

	function columnAt(index: number): Column<TRow> | undefined {
		return columns[index];
	}

	function columnWidthOf(column: Column<TRow>): string | undefined {
		const width = columnWidths[column.id];
		return width === undefined ? column.width : `${width}px`;
	}

	function isColumnResizable(column: Column<TRow>): boolean {
		return column.resizable ?? resizable;
	}

	function measuredWidth(columnIndex: number): number {
		const header = table?.querySelector<HTMLElement>(`th[data-col="${columnIndex}"]`);
		return header?.getBoundingClientRect().width ?? 0;
	}

	function setColumnWidth(column: Column<TRow>, width: number) {
		const next = Math.round(Math.max(width, column.minWidth ?? 40));
		if (columnWidths[column.id] === next) return next;

		columnWidths = { ...columnWidths, [column.id]: next };
		return next;
	}

	function startResize(event: PointerEvent, column: Column<TRow>, columnIndex: number) {
		if (event.button !== 0) return;

		event.preventDefault();
		event.stopPropagation();

		resizing = {
			columnId: column.id,
			startX: event.clientX,
			startWidth: columnWidths[column.id] ?? measuredWidth(columnIndex)
		};
	}

	function handleResizeMove(event: PointerEvent) {
		const current = resizing;
		if (!current) return;

		const column = columns.find((candidate) => candidate.id === current.columnId);
		if (!column) return;

		event.preventDefault();
		setColumnWidth(column, current.startWidth + (event.clientX - current.startX));
	}

	function endResize() {
		const current = resizing;
		resizing = null;
		if (!current) return;

		const width = columnWidths[current.columnId];
		if (width !== undefined) oncolumnresize?.({ columnId: current.columnId, width });
	}

	function handleResizeKeydown(event: KeyboardEvent, column: Column<TRow>, columnIndex: number) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

		event.preventDefault();
		event.stopPropagation();

		const step = (event.shiftKey ? 40 : 8) * (event.key === 'ArrowRight' ? 1 : -1);
		const base = columnWidths[column.id] ?? measuredWidth(columnIndex);
		oncolumnresize?.({ columnId: column.id, width: setColumnWidth(column, base + step) });
	}

	function autoSizeColumn(column: Column<TRow>, columnIndex: number) {
		const element = table;
		if (!element) return;

		const col = element.querySelector<HTMLElement>(`col[data-col="${columnIndex}"]`);
		const previousLayout = element.style.tableLayout;
		const previousWidth = col?.style.width ?? '';

		element.style.tableLayout = 'auto';
		if (col) col.style.width = 'auto';

		let width = 0;
		for (const cell of element.querySelectorAll<HTMLElement>(
			`th[data-col="${columnIndex}"], td[data-col="${columnIndex}"]`
		)) {
			width = Math.max(width, cell.getBoundingClientRect().width, cell.scrollWidth);
		}

		element.style.tableLayout = previousLayout;
		if (col) col.style.width = previousWidth;

		if (width > 0) {
			oncolumnresize?.({ columnId: column.id, width: setColumnWidth(column, width + 2) });
		}
	}

	function entryAt(index: number) {
		return viewEntries[index];
	}

	async function focusCellElement(position: CellPosition | null = focus) {
		if (!position) return;
		await tick();
		if (editing) return;
		table
			?.querySelector<HTMLTableCellElement>(
				`td[data-row="${position.row}"][data-col="${position.column}"]`
			)
			?.focus();
	}

	function setFocus(position: CellPosition | null, extend = false) {
		focus = position;
		if (!extend || !anchor) anchor = position;
		void focusCellElement(position);
	}

	function resetFocus() {
		focus = null;
		anchor = null;
		editing = null;
	}

	function toggleSort(columnId: string) {
		sort = nextSortState(sort, columnId);
		resetFocus();
		onsortchange?.(sort);
	}

	function setPage(next: number) {
		page = clampPage(next, totalRows, pageSize);
		resetFocus();
		onpagechange?.(page);
	}

	function setPageSize(next: number) {
		pageSize = next;
		page = 1;
		resetFocus();
		onpagesizechange?.(pageSize);
		onpagechange?.(page);
	}

	function selectAll() {
		if (viewEntries.length === 0 || columns.length === 0) return;
		anchor = { row: 0, column: 0 };
		focus = { row: viewEntries.length - 1, column: columns.length - 1 };
		void focusCellElement(focus);
	}

	function selectRow(row: number, extend = false) {
		const lastColumn = columns.length - 1;
		if (lastColumn < 0 || !entryAt(row)) return;

		anchor = { row: extend && anchor ? anchor.row : row, column: lastColumn };
		focus = { row, column: 0 };
		void focusCellElement(focus);
	}

	function rectCoversRow(rect: SelectionRect | null, row: number): boolean {
		return (
			!!rect &&
			row >= rect.top &&
			row <= rect.bottom &&
			rect.left === 0 &&
			rect.right === columns.length - 1
		);
	}

	function rowNumberText(options: RowNumbersOptions<TRow>, rowIndex: number, row: TRow): string {
		const rowNumber = visibleRange.start + rowIndex;
		return options.format ? options.format(rowNumber, row) : String(rowNumber);
	}

	function startEdit(position: CellPosition, initialText?: string) {
		const column = columnAt(position.column);
		const entry = entryAt(position.row);
		if (!column || !entry || !isColumnEditable(column, editable)) return;

		focus = position;
		anchor = position;
		editing = {
			position,
			text: initialText ?? formatCell(column, entry.row, column.value(entry.row))
		};
	}

	function emitChanges(changes: CellChange<TRow>[]) {
		if (changes.length > 0) onchange?.(changes);
	}

	function buildChange(position: CellPosition, value: unknown, changes: CellChange<TRow>[]): void {
		const column = columnAt(position.column);
		const entry = entryAt(position.row);
		if (!column || !entry) return;

		const previousValue = column.value(entry.row);
		if (Object.is(value, previousValue)) return;

		changes.push({
			rowIndex: entry.index,
			row: entry.row,
			columnId: column.id,
			value,
			previousValue
		});
	}

	function applyMove(position: CellPosition, move: EditorMove) {
		const rowCount = viewEntries.length;
		const columnCount = columns.length;

		if (move === 'down') setFocus(movePosition(position, 1, 0, rowCount, columnCount));
		else if (move === 'up') setFocus(movePosition(position, -1, 0, rowCount, columnCount));
		else if (move === 'right')
			setFocus(moveNextCell(position, 1, rowCount, columnCount) ?? position);
		else if (move === 'left')
			setFocus(moveNextCell(position, -1, rowCount, columnCount) ?? position);
		else void focusCellElement(position);
	}

	function commitEditText(text: string, move: EditorMove) {
		const current = editing;
		editing = null;
		if (!current) return;

		const column = columnAt(current.position.column);
		const entry = entryAt(current.position.row);

		if (column && entry) {
			const previousValue = column.value(entry.row);
			const changes: CellChange<TRow>[] = [];
			buildChange(current.position, parseCell(column, entry.row, text, previousValue), changes);
			emitChanges(changes);
		}

		applyMove(current.position, move);
	}

	function commitEditValue(value: unknown, move: EditorMove = null) {
		const current = editing;
		editing = null;
		if (!current) return;

		const changes: CellChange<TRow>[] = [];
		buildChange(current.position, value, changes);
		emitChanges(changes);
		applyMove(current.position, move);
	}

	function cancelEdit() {
		const current = editing;
		editing = null;
		if (current) void focusCellElement(current.position);
	}

	function clearSelectedCells() {
		if (!editable || !selection) return;

		const changes: CellChange<TRow>[] = [];
		for (let row = selection.top; row <= selection.bottom; row += 1) {
			const entry = entryAt(row);
			if (!entry) continue;

			for (let column = selection.left; column <= selection.right; column += 1) {
				const definition = columnAt(column);
				if (!definition || !isColumnEditable(definition, editable)) continue;

				const previousValue = definition.value(entry.row);
				const value = definition.parse
					? definition.parse('', entry.row)
					: emptyValue(previousValue);
				buildChange({ row, column }, value, changes);
			}
		}

		emitChanges(changes);
	}

	function selectionText(): string {
		if (!selection) return '';

		const matrix: string[][] = [];
		for (let row = selection.top; row <= selection.bottom; row += 1) {
			const entry = entryAt(row);
			const line: string[] = [];

			for (let column = selection.left; column <= selection.right; column += 1) {
				const definition = columnAt(column);
				line.push(
					entry && definition ? formatCell(definition, entry.row, definition.value(entry.row)) : ''
				);
			}
			matrix.push(line);
		}

		return toTsv(matrix);
	}

	function applyPastedText(text: string) {
		if (!editable || !selection) return;

		const size = rectSize(selection);
		const matrix = expandMatrix(parseTsv(text), size.rows, size.columns);
		if (matrix.length === 0) return;

		const changes: CellChange<TRow>[] = [];
		for (let row = 0; row < matrix.length; row += 1) {
			const entry = entryAt(selection.top + row);
			if (!entry) continue;

			for (let column = 0; column < matrix[row].length; column += 1) {
				const definition = columnAt(selection.left + column);
				if (!definition || !isColumnEditable(definition, editable)) continue;

				const position = { row: selection.top + row, column: selection.left + column };
				const previousValue = definition.value(entry.row);
				buildChange(
					position,
					parseCell(definition, entry.row, matrix[row][column], previousValue),
					changes
				);
			}
		}

		emitChanges(changes);

		const lastRow = Math.min(selection.top + matrix.length - 1, viewEntries.length - 1);
		const lastColumn = Math.min(selection.left + (matrix[0]?.length ?? 1) - 1, columns.length - 1);
		anchor = { row: selection.top, column: selection.left };
		focus = { row: lastRow, column: lastColumn };
	}

	function copyToClipboard() {
		const text = selectionText();
		if (!text) return;
		navigator.clipboard?.writeText(text).catch(() => undefined);
	}

	function pasteFromClipboard() {
		navigator.clipboard?.readText().then(applyPastedText, () => undefined);
	}

	function handleCopy(event: ClipboardEvent) {
		if (!clipboard || editing || !selection) return;
		event.preventDefault();
		event.clipboardData?.setData('text/plain', selectionText());
	}

	function handleCut(event: ClipboardEvent) {
		if (!clipboard || editing || !selection) return;
		handleCopy(event);
		clearSelectedCells();
	}

	function handlePaste(event: ClipboardEvent) {
		if (!clipboard || editing || !editable) return;
		const text = event.clipboardData?.getData('text/plain');
		if (!text) return;
		event.preventDefault();
		applyPastedText(text);
	}

	function defaultMenuItems(): ContextMenuItem[] {
		const column = focus ? columnAt(focus.column) : undefined;
		const cellEditable = editable && !!column && isColumnEditable(column, editable);
		const items: ContextMenuItem[] = [];

		if (clipboard) {
			items.push({
				id: 'copy',
				label: 'Copy',
				disabled: !selection,
				action: copyToClipboard
			});

			if (editable) {
				items.push(
					{
						id: 'cut',
						label: 'Cut',
						disabled: !cellEditable,
						action: () => {
							copyToClipboard();
							clearSelectedCells();
						}
					},
					{
						id: 'paste',
						label: 'Paste',
						disabled: !cellEditable,
						action: pasteFromClipboard
					}
				);
			}
		}

		if (editable) {
			items.push({
				id: 'clear',
				label: 'Clear',
				disabled: !cellEditable,
				action: clearSelectedCells
			});
		}

		if (exportable) {
			if (items.length > 0) items.push({ id: 'export-separator', separator: true });
			items.push({ id: 'export-csv', label: 'Export CSV', action: () => exportRows('csv') });

			if (xlsxExporter) {
				items.push({ id: 'export-xlsx', label: 'Export XLSX', action: () => exportRows('xlsx') });
			}
		}

		if (items.length > 0) items.push({ id: 'separator', separator: true });
		items.push({ id: 'select-all', label: 'Select all', action: selectAll });

		return items;
	}

	function exportRows(format: 'csv' | 'xlsx') {
		const data = sortedEntries.map((entry) => entry.row);
		const extra = rowNumberOptions?.includeInExport ? { rowNumbers: rowNumberOptions } : {};

		if (format === 'csv') {
			downloadCsv(data, columns, { filename: `${exportFilename}.csv`, ...extra });
			return;
		}

		if (!xlsxExporter) return;

		Promise.resolve(
			xlsxExporter(data, columns, {
				filename: `${exportFilename}.xlsx`,
				sheetName: exportSheetName ?? exportFilename,
				...extra
			})
		).catch((error: unknown) => {
			if (onexporterror) onexporterror(error);
			else throw error;
		});
	}

	function selectedRows(): TRow[] {
		if (!selection) return [];

		const result: TRow[] = [];
		for (let row = selection.top; row <= selection.bottom; row += 1) {
			const entry = entryAt(row);
			if (entry) result.push(entry.row);
		}
		return result;
	}

	function handleContextMenu(event: MouseEvent) {
		if (!contextMenu) return;

		const cell = (event.target as HTMLElement | null)?.closest<HTMLTableCellElement>(
			'td[data-row], th[data-row]'
		);
		if (!cell) return;

		const row = Number(cell.dataset.row);
		const isRowNumber = cell.dataset.col === undefined;
		if (isRowNumber && !rowNumbersSelectable) return;

		event.preventDefault();

		let column: Column<TRow> | undefined;
		if (isRowNumber) {
			if (!rectCoversRow(selection, row)) selectRow(row);
		} else {
			const position = { row, column: Number(cell.dataset.col) };
			if (!rectContains(selection, position.row, position.column)) setFocus(position);
			column = columnAt(position.column);
		}

		const entry = entryAt(row);
		const defaultItems = defaultMenuItems();
		const items = contextMenuItems
			? contextMenuItems({
				row: entry?.row ?? null,
				rowIndex: entry?.index ?? -1,
				column: column ?? null,
				selectedRows: selectedRows(),
				defaultItems
			})
			: defaultItems;

		if (items.length === 0) return;
		menu = { x: event.clientX, y: event.clientY, items };
	}

	function closeMenu() {
		menu = null;
		void focusCellElement();
	}

	function handleCellPointerDown(event: PointerEvent, position: CellPosition) {
		if (event.button === 2) return;
		if (editing) return;

		dragging = 'cells';
		setFocus(position, event.shiftKey);
	}

	function handleCellPointerEnter(position: CellPosition) {
		if (!dragging || editing) return;
		focus = dragging === 'rows' ? { row: position.row, column: 0 } : position;
	}

	function handleRowNumberPointerDown(event: PointerEvent, row: number) {
		if (event.button === 2 || editing || !rowNumbersSelectable) return;

		dragging = 'rows';
		selectRow(row, event.shiftKey);
	}

	function handleRowNumberPointerEnter(row: number) {
		if (!dragging || editing || !rowNumbersSelectable) return;
		focus = { row, column: 0 };
	}

	function handleTableFocus() {
		if (editing) return;
		if (focus) {
			void focusCellElement();
			return;
		}
		if (viewEntries.length > 0 && columns.length > 0) setFocus({ row: 0, column: 0 });
	}

	function handleKeydown(event: KeyboardEvent) {
		if (editing || menu) return;

		const rowCount = viewEntries.length;
		const columnCount = columns.length;
		if (rowCount === 0 || columnCount === 0) return;

		const modifier = event.ctrlKey || event.metaKey;
		const current = focus ?? { row: 0, column: 0 };
		const jump = Math.max(rowCount, columnCount);

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				setFocus(
					movePosition(current, modifier ? jump : 1, 0, rowCount, columnCount),
					event.shiftKey
				);
				return;
			case 'ArrowUp':
				event.preventDefault();
				setFocus(
					movePosition(current, modifier ? -jump : -1, 0, rowCount, columnCount),
					event.shiftKey
				);
				return;
			case 'ArrowLeft':
				event.preventDefault();
				setFocus(
					movePosition(current, 0, modifier ? -jump : -1, rowCount, columnCount),
					event.shiftKey
				);
				return;
			case 'ArrowRight':
				event.preventDefault();
				setFocus(
					movePosition(current, 0, modifier ? jump : 1, rowCount, columnCount),
					event.shiftKey
				);
				return;
			case 'Home':
				event.preventDefault();
				setFocus(
					clampPosition({ row: modifier ? 0 : current.row, column: 0 }, rowCount, columnCount),
					event.shiftKey
				);
				return;
			case 'End':
				event.preventDefault();
				setFocus(
					clampPosition(
						{ row: modifier ? rowCount - 1 : current.row, column: columnCount - 1 },
						rowCount,
						columnCount
					),
					event.shiftKey
				);
				return;
			case 'PageDown':
				event.preventDefault();
				if (paginated) setPage(currentPage + 1);
				else setFocus(movePosition(current, 10, 0, rowCount, columnCount), event.shiftKey);
				return;
			case 'PageUp':
				event.preventDefault();
				if (paginated) setPage(currentPage - 1);
				else setFocus(movePosition(current, -10, 0, rowCount, columnCount), event.shiftKey);
				return;
			case 'Tab':
				event.preventDefault();
				setFocus(moveNextCell(current, event.shiftKey ? -1 : 1, rowCount, columnCount) ?? current);
				return;
			case 'Enter':
			case 'F2':
				event.preventDefault();
				startEdit(current);
				return;
			case 'Escape':
				event.preventDefault();
				setFocus(current);
				return;
			case 'Delete':
			case 'Backspace':
				if (!editable) return;
				event.preventDefault();
				clearSelectedCells();
				return;
		}

		if (modifier && event.key.toLowerCase() === 'a') {
			event.preventDefault();
			selectAll();
			return;
		}

		if (!modifier && !event.altKey && event.key.length === 1 && editable) {
			event.preventDefault();
			startEdit(current, event.key);
		}
	}
</script>

<svelte:window
	onpointermove={handleResizeMove}
	onpointerup={() => {
		dragging = null;
		endResize();
	}}
	onpointercancel={endResize}
/>

<div class="ssdg ssdg-theme-{theme} {className}" class:ssdg-is-resizing={!!resizing}>
	<div
		class="ssdg-viewport"
		style:height
		style:scroll-padding-left={rowNumberOptions ? rowNumberWidth : undefined}
	>
		<table
			bind:this={table}
			class="ssdg-table"
			role="grid"
			tabindex="0"
			onkeydown={handleKeydown}
			oncopy={handleCopy}
			oncut={handleCut}
			onpaste={handlePaste}
			oncontextmenu={handleContextMenu}
			onfocus={handleTableFocus}
		>
			<colgroup>
				{#if rowNumberOptions}
					<col class="ssdg-row-number-col" style:width={rowNumberWidth} />
				{/if}
				{#each columns as column, columnIndex (column.id)}
					<col data-col={columnIndex} style:width={columnWidthOf(column)} />
				{/each}
				<col class="ssdg-spacer-col" />
			</colgroup>

			<thead>
				<tr>
					{#if rowNumberOptions}
						<th scope="col" class="ssdg-row-number">{rowNumberOptions.header ?? ''}</th>
					{/if}
					{#each columns as column, columnIndex (column.id)}
						<th
							scope="col"
							data-col={columnIndex}
							class:ssdg-resizing={resizing?.columnId === column.id}
							style:text-align={column.align ?? 'left'}
							aria-sort={sort?.columnId === column.id
							? sort.direction === 'asc'
								? 'ascending'
								: 'descending'
							: 'none'}
						>
							{#if column.headerCell}
								{@render column.headerCell({ column, sort: sort ?? null })}
							{:else if column.sortable}
								<button type="button" class="ssdg-sort" onclick={() => toggleSort(column.id)}>
									<span>{column.header}</span>
									<span class="ssdg-sort-icon" aria-hidden="true">
										{#if sort?.columnId === column.id}
											{sort.direction === 'asc' ? '▲' : '▼'}
										{:else}
											↕
										{/if}
									</span>
								</button>
							{:else}
								{column.header}
							{/if}

							{#if isColumnResizable(column)}
								<button
									type="button"
									class="ssdg-resizer"
									tabindex="-1"
									aria-label="Resize {column.header}"
									onpointerdown={(event) => startResize(event, column, columnIndex)}
									onkeydown={(event) => handleResizeKeydown(event, column, columnIndex)}
									ondblclick={() => autoSizeColumn(column, columnIndex)}
								></button>
							{/if}
						</th>
					{/each}
					<th class="ssdg-spacer" aria-hidden="true"></th>
				</tr>
			</thead>

			<tbody>
				{#each viewEntries as entry, rowIndex (rowKey(entry.row, entry.index))}
					<tr>
						{#if rowNumberOptions}
							<th
								scope="row"
								class="ssdg-row-number"
								class:ssdg-selected={rectCoversRow(selection, rowIndex)}
								data-row={rowIndex}
								onpointerdown={(event) => handleRowNumberPointerDown(event, rowIndex)}
								onpointerenter={() => handleRowNumberPointerEnter(rowIndex)}
							>
								{rowNumberText(rowNumberOptions, rowIndex, entry.row)}
							</th>
						{/if}
						{#each columns as column, columnIndex (column.id)}
							{@const value = column.value(entry.row)}
							{@const isFocused = focus?.row === rowIndex && focus?.column === columnIndex}
							{@const isSelected = rectContains(selection, rowIndex, columnIndex)}
							{@const isEditing = editing?.position.row === rowIndex && editing?.position.column === columnIndex}
							<td
								role="gridcell"
								tabindex="-1"
								data-row={rowIndex}
								data-col={columnIndex}
								class:ssdg-selected={isSelected}
								class:ssdg-focused={isFocused}
								class:ssdg-editing={isEditing}
								style:text-align={column.align ?? 'left'}
								onpointerdown={(event) => handleCellPointerDown(event, { row: rowIndex, column: columnIndex })}
								onpointerenter={() => handleCellPointerEnter({ row: rowIndex, column: columnIndex })}
								ondblclick={() => startEdit({ row: rowIndex, column: columnIndex })}
							>
								{#if isEditing}
									{#if column.editor}
										{@render column.editor({
											row: entry.row,
											rowIndex: entry.index,
											value,
											column,
											commit: commitEditValue,
											cancel: cancelEdit
										})}
									{:else if column.options}
										<SelectEditor
											{value}
											options={normalizeOptions(column, entry.row)}
											align={column.align}
											oncommit={commitEditValue}
											oncancel={cancelEdit}
										/>
									{:else}
										<CellEditor
											value={editing?.text ?? ''}
											align={column.align}
											oncommit={commitEditText}
											oncancel={cancelEdit}
										/>
									{/if}
								{:else if column.cell}
									{@render column.cell({
										row: entry.row,
										rowIndex: entry.index,
										value,
										text: formatCell(column, entry.row, value),
										column,
										focused: isFocused,
										selected: isSelected
									})}
								{:else}
									{formatCell(column, entry.row, value)}
								{/if}
							</td>
						{/each}
						<td class="ssdg-spacer" aria-hidden="true"></td>
					</tr>
				{:else}
					<tr>
						<td class="ssdg-empty" colspan={columns.length + (rowNumberOptions ? 2 : 1)}>
							{emptyMessage}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if showBottomBar}
		<div class="ssdg-bottom">
			<BottomBar context={bottomBarContext} content={bottomBarContent} />
		</div>
	{/if}

	{#if menu}
		<ContextMenu x={menu.x} y={menu.y} items={menu.items} onclose={closeMenu} />
	{/if}
</div>

<style>
	.ssdg {
		--ssdg-bg: #fff;
		--ssdg-color: #0f172a;
		--ssdg-editor-bg: var(--ssdg-bg);
		--ssdg-border-color: #e2e8f0;
		--ssdg-row-border-color: var(--ssdg-border-color);
		--ssdg-header-border-color: var(--ssdg-border-color);
		--ssdg-header-bg: #f8fafc;
		--ssdg-header-color: inherit;
		--ssdg-bottom-bar-bg: #f8fafc;
		--ssdg-menu-bg: #fff;
		--ssdg-menu-hover-bg: #f1f5f9;
		--ssdg-accent-color: #2563eb;
		--ssdg-selection-bg: rgb(37 99 235 / 10%);
		--ssdg-stripe-bg: transparent;
		--ssdg-hover-bg: transparent;
		--ssdg-muted-color: #64748b;
		--ssdg-row-height: 2rem;
		--ssdg-header-height: var(--ssdg-row-height);
		--ssdg-cell-padding: 0.5rem;
		--ssdg-font-size: 0.875rem;
		--ssdg-font-family: inherit;
		--ssdg-radius: 0.375rem;
		--ssdg-focus-width: 2px;

		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--ssdg-border-color);
		border-radius: var(--ssdg-radius);
		background: var(--ssdg-bg);
		color: var(--ssdg-color);
		font-family: var(--ssdg-font-family);
		font-size: var(--ssdg-font-size);
	}

	.ssdg-theme-spreadsheet {
		--ssdg-border-color: #bdc3c7;
		--ssdg-row-border-color: rgb(189 195 199 / 58%);
		--ssdg-header-border-color: rgb(189 195 199 / 50%);
		--ssdg-header-bg: #f5f7f7;
		--ssdg-header-color: rgb(0 0 0 / 54%);
		--ssdg-bottom-bar-bg: #f5f7f7;
		--ssdg-menu-bg: #fff;
		--ssdg-menu-hover-bg: #ecf0f1;
		--ssdg-accent-color: #0091ea;
		--ssdg-selection-bg: rgb(0 145 234 / 20%);
		--ssdg-stripe-bg: #fcfdfe;
		--ssdg-hover-bg: rgb(0 145 234 / 8%);
		--ssdg-muted-color: rgb(0 0 0 / 54%);
		--ssdg-bg: #fff;
		--ssdg-color: #000;
		--ssdg-row-height: 28px;
		--ssdg-header-height: 32px;
		--ssdg-cell-padding: 12px;
		--ssdg-font-size: 12px;
		--ssdg-font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen-Sans,
			Ubuntu,
			Cantarell,
			'Helvetica Neue',
			sans-serif;
		--ssdg-radius: 2px;
		--ssdg-focus-width: 1px;
	}

	.ssdg-is-resizing {
		cursor: col-resize;
	}

	.ssdg-viewport {
		overflow: auto;
	}

	.ssdg-bottom {
		container: ssdg-bottom / inline-size;
	}

	.ssdg-table {
		width: 100%;
		table-layout: fixed;
		border-collapse: separate;
		border-spacing: 0;
		outline: none;
	}

	.ssdg-table :is(th, td) {
		height: var(--ssdg-row-height);
		padding: 0 var(--ssdg-cell-padding);
		border-right: 1px solid var(--ssdg-border-color);
		border-bottom: 1px solid var(--ssdg-row-border-color);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.ssdg-table :is(th, td):last-child {
		border-right: none;
	}

	.ssdg-table thead th {
		position: sticky;
		top: 0;
		z-index: 2;
		height: var(--ssdg-header-height);
		user-select: none;
		border-right-color: var(--ssdg-header-border-color);
		border-bottom-color: var(--ssdg-border-color);
		background: var(--ssdg-header-bg);
		color: var(--ssdg-header-color);
		font-weight: 600;
	}

	.ssdg-table th.ssdg-row-number {
		position: sticky;
		left: 0;
		z-index: 1;
		border-right-color: var(--ssdg-border-color);
		background: var(--ssdg-header-bg);
		color: var(--ssdg-muted-color);
		font-weight: 400;
		font-variant-numeric: tabular-nums;
		text-align: center;
		user-select: none;
	}

	.ssdg-table thead th.ssdg-row-number {
		z-index: 3;
		color: var(--ssdg-header-color);
		font-weight: 600;
	}

	.ssdg-table tbody th.ssdg-row-number.ssdg-selected {
		background-image: linear-gradient(var(--ssdg-selection-bg), var(--ssdg-selection-bg));
		color: var(--ssdg-accent-color);
	}

	.ssdg-table td {
		outline: none;
		user-select: none;
	}

	.ssdg-table tbody tr:nth-child(even) td {
		background-color: var(--ssdg-stripe-bg);
	}

	.ssdg-table tbody tr:hover td {
		background-image: linear-gradient(var(--ssdg-hover-bg), var(--ssdg-hover-bg));
	}

	.ssdg-table tbody tr td.ssdg-selected {
		background-image: linear-gradient(var(--ssdg-selection-bg), var(--ssdg-selection-bg));
	}

	.ssdg-table tbody tr:hover td.ssdg-selected {
		background-image:
			linear-gradient(var(--ssdg-selection-bg), var(--ssdg-selection-bg)),
			linear-gradient(var(--ssdg-hover-bg), var(--ssdg-hover-bg));
	}

	.ssdg-table td.ssdg-focused {
		outline: var(--ssdg-focus-width) solid var(--ssdg-accent-color);
		outline-offset: calc(-1 * var(--ssdg-focus-width));
	}

	.ssdg-table td.ssdg-editing {
		padding: 0;
	}

	.ssdg-table :is(th, td).ssdg-spacer {
		padding: 0;
		border-right: none;
	}

	.ssdg-resizer {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 2;
		width: 9px;
		height: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: col-resize;
		touch-action: none;
	}

	.ssdg-resizer::after {
		content: '';
		position: absolute;
		top: 15%;
		right: 3px;
		width: 2px;
		height: 70%;
		background: transparent;
	}

	.ssdg-resizer:hover::after,
	.ssdg-resizer:focus-visible::after,
	.ssdg-resizing .ssdg-resizer::after {
		background: var(--ssdg-accent-color);
	}

	.ssdg-sort {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.ssdg-sort-icon {
		color: var(--ssdg-muted-color);
		font-size: 0.75em;
	}

	.ssdg-empty {
		color: var(--ssdg-muted-color);
		text-align: center;
	}
</style>
