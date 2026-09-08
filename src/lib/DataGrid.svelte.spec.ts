import { flushSync, mount, tick, unmount, type Component } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DataGrid from './DataGrid.svelte';
import type { CellChange, Column, DataGridProps } from './core/types.js';

interface Person {
	name: string;
	age: number;
	role: string;
}

const baseRows: Person[] = [
	{ name: 'Alice', age: 30, role: 'admin' },
	{ name: 'Bob', age: 35, role: 'user' },
	{ name: 'Carol', age: 25, role: 'guest' }
];

const roleColumns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name },
	{
		id: 'role',
		header: 'Role',
		value: (row) => row.role,
		format: (value) => String(value).toUpperCase(),
		options: [
			{ value: 'admin', label: 'Administrator' },
			{ value: 'user', label: 'User' },
			{ value: 'guest', label: 'Guest', disabled: true }
		]
	}
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name, sortable: true },
	{ id: 'age', header: 'Age', value: (row) => row.age, align: 'right' }
];

const Grid = DataGrid as unknown as Component<DataGridProps<Person>>;

let component: Record<string, unknown> | null = null;

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

function setup(props: Partial<DataGridProps<Person>> = {}) {
	const target = document.createElement('div');
	document.body.append(target);

	component = mount(Grid, {
		target,
		props: { rows: baseRows, columns, ...props } as DataGridProps<Person>
	});
	flushSync();

	const table = target.querySelector('table') as HTMLTableElement;
	const cell = (row: number, column: number) =>
		table.querySelector(`td[data-row="${row}"][data-col="${column}"]`) as HTMLTableCellElement;

	return { target, table, cell };
}

function pointerdown(element: Element, init: MouseEventInit = {}) {
	element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, ...init }));
	flushSync();
}

function keydown(element: Element, key: string, init: KeyboardEventInit = {}) {
	element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key, ...init }));
	flushSync();
}

function clipboardEvent(type: 'copy' | 'cut' | 'paste', text = '') {
	const store = new Map<string, string>([['text/plain', text]]);
	const event = new Event(type, { bubbles: true, cancelable: true });

	Object.defineProperty(event, 'clipboardData', {
		value: {
			getData: (format: string) => store.get(format) ?? '',
			setData: (format: string, value: string) => store.set(format, value)
		}
	});

	return { event, read: () => store.get('text/plain') ?? '' };
}

describe('focus and selection', () => {
	it('focuses a clicked cell', () => {
		const { cell } = setup();

		pointerdown(cell(1, 1));
		expect(cell(1, 1).classList.contains('ssdg-focused')).toBe(true);
		expect(cell(1, 1).classList.contains('ssdg-selected')).toBe(true);
	});

	it('moves focus with the arrow keys', () => {
		const { table, cell } = setup();

		pointerdown(cell(0, 0));
		keydown(table, 'ArrowDown');
		keydown(table, 'ArrowRight');

		expect(cell(1, 1).classList.contains('ssdg-focused')).toBe(true);
	});

	it('extends the selection with shift and arrow keys', () => {
		const { table, cell } = setup();

		pointerdown(cell(0, 0));
		keydown(table, 'ArrowDown', { shiftKey: true });
		keydown(table, 'ArrowRight', { shiftKey: true });

		expect(cell(0, 0).classList.contains('ssdg-selected')).toBe(true);
		expect(cell(1, 1).classList.contains('ssdg-selected')).toBe(true);
		expect(cell(2, 0).classList.contains('ssdg-selected')).toBe(false);
	});

	it('selects a range by dragging', () => {
		const { cell } = setup();

		pointerdown(cell(0, 0));
		cell(1, 1).dispatchEvent(new MouseEvent('pointerenter'));
		flushSync();

		expect(cell(0, 1).classList.contains('ssdg-selected')).toBe(true);
		expect(cell(1, 1).classList.contains('ssdg-focused')).toBe(true);

		window.dispatchEvent(new MouseEvent('pointerup'));
		flushSync();
		cell(2, 0).dispatchEvent(new MouseEvent('pointerenter'));
		flushSync();

		expect(cell(2, 0).classList.contains('ssdg-selected')).toBe(false);
	});

	it('selects everything with ctrl+a', () => {
		const { table, cell } = setup();

		pointerdown(cell(0, 0));
		keydown(table, 'a', { ctrlKey: true });

		expect(cell(2, 1).classList.contains('ssdg-selected')).toBe(true);
	});

	it('wraps to the next row with tab', () => {
		const { table, cell } = setup();

		pointerdown(cell(0, 1));
		keydown(table, 'Tab');

		expect(cell(1, 0).classList.contains('ssdg-focused')).toBe(true);
	});

	it('clears the focus when the page changes', () => {
		const { target, table, cell } = setup({ paginated: true, pageSize: 2 });

		pointerdown(cell(0, 0));
		(target.querySelector('button[aria-label="Next page"]') as HTMLButtonElement).click();
		flushSync();

		expect(table.querySelector('.ssdg-focused')).toBeNull();
	});

	it('reports the focused cell', () => {
		const onfocuschange = vi.fn();
		const { cell } = setup({ onfocuschange });

		pointerdown(cell(2, 1));
		expect(onfocuschange).toHaveBeenLastCalledWith({ rowIndex: 2, columnId: 'age' });
	});
});

describe('editing', () => {
	it('edits a cell with the keyboard and emits the change', async () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, onchange });

		pointerdown(cell(0, 0));
		keydown(table, 'Enter');
		await tick();

		const input = table.querySelector('input.ssdg-editor') as HTMLInputElement;
		expect(input.value).toBe('Alice');

		input.value = 'Alicia';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		keydown(input, 'Enter');

		expect(onchange).toHaveBeenCalledTimes(1);
		expect(onchange.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, row: baseRows[0], columnId: 'name', value: 'Alicia', previousValue: 'Alice' }
		]);
		expect(table.querySelector('input.ssdg-editor')).toBeNull();
	});

	it('parses the value based on the previous type', async () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, onchange });

		pointerdown(cell(1, 1));
		keydown(table, 'F2');
		await tick();

		const input = table.querySelector('input.ssdg-editor') as HTMLInputElement;
		input.value = '41';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		keydown(input, 'Enter');

		expect(onchange.mock.calls[0][0][0]).toMatchObject({ columnId: 'age', value: 41 });
	});

	it('cancels editing with escape', async () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, onchange });

		pointerdown(cell(0, 0));
		keydown(table, 'Enter');
		await tick();

		const input = table.querySelector('input.ssdg-editor') as HTMLInputElement;
		input.value = 'Nope';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		keydown(input, 'Escape');

		expect(onchange).not.toHaveBeenCalled();
		expect(table.querySelector('input.ssdg-editor')).toBeNull();
	});

	it('starts editing when typing a printable character', async () => {
		const { table, cell } = setup({ editable: true });

		pointerdown(cell(0, 0));
		keydown(table, 'Z');
		await tick();

		const input = table.querySelector('input.ssdg-editor') as HTMLInputElement;
		expect(input.value).toBe('Z');
	});

	it('respects a column that is not editable', async () => {
		const { table, cell } = setup({
			editable: true,
			columns: [
				{ id: 'name', header: 'Name', value: (row: Person) => row.name, editable: false },
				{ id: 'age', header: 'Age', value: (row: Person) => row.age }
			]
		});

		pointerdown(cell(0, 0));
		keydown(table, 'Enter');
		await tick();
		expect(table.querySelector('input.ssdg-editor')).toBeNull();

		pointerdown(cell(0, 1));
		keydown(table, 'Enter');
		await tick();
		expect(table.querySelector('input.ssdg-editor')).not.toBeNull();
	});

	it('does not edit when the grid is read only', async () => {
		const { table, cell } = setup();

		pointerdown(cell(0, 0));
		keydown(table, 'Enter');
		await tick();

		expect(table.querySelector('input.ssdg-editor')).toBeNull();
	});

	it('clears the selected cells with delete', () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, onchange });

		pointerdown(cell(0, 0));
		keydown(table, 'ArrowRight', { shiftKey: true });
		keydown(table, 'Delete');

		const changes = onchange.mock.calls[0][0] as CellChange<Person>[];
		expect(changes).toHaveLength(2);
		expect(changes[0]).toMatchObject({ columnId: 'name', value: '' });
		expect(changes[1]).toMatchObject({ columnId: 'age', value: null });
	});
});

describe('select editor', () => {
	it('renders the column options', async () => {
		const { table, cell } = setup({ editable: true, columns: roleColumns });

		pointerdown(cell(0, 1));
		keydown(table, 'Enter');
		await tick();

		const select = table.querySelector('select.ssdg-editor-select') as HTMLSelectElement;
		expect([...select.options].map((option) => option.textContent)).toEqual([
			'Administrator',
			'User',
			'Guest'
		]);
		expect(select.value).toBe('0');
		expect(select.options[2].disabled).toBe(true);
	});

	it('commits the selected option value', async () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, columns: roleColumns, onchange });

		pointerdown(cell(1, 1));
		keydown(table, 'Enter');
		await tick();

		const select = table.querySelector('select.ssdg-editor-select') as HTMLSelectElement;
		select.value = '0';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(onchange.mock.calls[0][0]).toEqual([
			{ rowIndex: 1, row: baseRows[1], columnId: 'role', value: 'admin', previousValue: 'user' }
		]);
		expect(table.querySelector('select.ssdg-editor-select')).toBeNull();
	});

	it('cancels with escape', async () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, columns: roleColumns, onchange });

		pointerdown(cell(0, 1));
		keydown(table, 'Enter');
		await tick();

		const select = table.querySelector('select.ssdg-editor-select') as HTMLSelectElement;
		select.value = '1';
		keydown(select, 'Escape');

		expect(onchange).not.toHaveBeenCalled();
		expect(table.querySelector('select.ssdg-editor-select')).toBeNull();
	});

	it('maps pasted text to an option value', () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, columns: roleColumns, onchange });

		pointerdown(cell(0, 1));
		table.dispatchEvent(clipboardEvent('paste', 'User').event);
		flushSync();

		expect(onchange.mock.calls[0][0][0]).toMatchObject({ columnId: 'role', value: 'user' });
	});

	it('ignores pasted text that is not an option', () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, columns: roleColumns, onchange });

		pointerdown(cell(0, 1));
		table.dispatchEvent(clipboardEvent('paste', 'Root').event);
		flushSync();

		expect(onchange).not.toHaveBeenCalled();
	});
});

describe('clipboard', () => {
	it('copies the selection as tsv', () => {
		const { table, cell } = setup();

		pointerdown(cell(0, 0));
		keydown(table, 'ArrowDown', { shiftKey: true });
		keydown(table, 'ArrowRight', { shiftKey: true });

		const { event, read } = clipboardEvent('copy');
		table.dispatchEvent(event);
		flushSync();

		expect(read()).toBe('Alice\t30\nBob\t35');
	});

	it('cuts the selection and clears the cells', () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, onchange });

		pointerdown(cell(0, 0));

		const { event, read } = clipboardEvent('cut');
		table.dispatchEvent(event);
		flushSync();

		expect(read()).toBe('Alice');
		expect(onchange.mock.calls[0][0]).toEqual([
			{ rowIndex: 0, row: baseRows[0], columnId: 'name', value: '', previousValue: 'Alice' }
		]);
	});

	it('pastes tsv into the grid', () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, onchange });

		pointerdown(cell(0, 0));

		const { event } = clipboardEvent('paste', 'Zoe\t44\nYan\t55');
		table.dispatchEvent(event);
		flushSync();

		const changes = onchange.mock.calls[0][0] as CellChange<Person>[];
		expect(changes).toEqual([
			{ rowIndex: 0, row: baseRows[0], columnId: 'name', value: 'Zoe', previousValue: 'Alice' },
			{ rowIndex: 0, row: baseRows[0], columnId: 'age', value: 44, previousValue: 30 },
			{ rowIndex: 1, row: baseRows[1], columnId: 'name', value: 'Yan', previousValue: 'Bob' },
			{ rowIndex: 1, row: baseRows[1], columnId: 'age', value: 55, previousValue: 35 }
		]);
	});

	it('fills the selection when pasting a single value', () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ editable: true, onchange });

		pointerdown(cell(0, 0));
		keydown(table, 'ArrowDown', { shiftKey: true });

		const { event } = clipboardEvent('paste', 'Same');
		table.dispatchEvent(event);
		flushSync();

		const changes = onchange.mock.calls[0][0] as CellChange<Person>[];
		expect(changes.map((change) => change.value)).toEqual(['Same', 'Same']);
	});

	it('ignores paste when the grid is read only', () => {
		const onchange = vi.fn();
		const { table, cell } = setup({ onchange });

		pointerdown(cell(0, 0));
		const { event } = clipboardEvent('paste', 'Zoe');
		table.dispatchEvent(event);
		flushSync();

		expect(onchange).not.toHaveBeenCalled();
	});
});

describe('pagination', () => {
	it('renders a single page and moves between pages', () => {
		const { target, table } = setup({ paginated: true, pageSize: 2 });

		expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
		expect(target.textContent).toContain('1–2 of 3');

		const next = target.querySelector('button[aria-label="Next page"]') as HTMLButtonElement;
		next.click();
		flushSync();

		expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
		expect(table.textContent).toContain('Carol');
		expect(target.textContent).toContain('3–3 of 3');
	});

	it('renders a compact page indicator for narrow layouts', () => {
		const { target } = setup({ paginated: true, pageSize: 1 });

		const active = target.querySelector('.ssdg-page-number.active') as HTMLButtonElement;
		expect(active.textContent?.trim()).toBe('1');
		expect(target.querySelector('.ssdg-page-total')?.textContent?.trim()).toBe('/ 3');
		expect(target.querySelectorAll('.ssdg-page-edge')).toHaveLength(2);
	});

	it('changes the page size', () => {
		const onpagesizechange = vi.fn();
		const { target, table } = setup({ paginated: true, pageSize: 2, onpagesizechange });

		const select = target.querySelector('select') as HTMLSelectElement;
		select.value = '10';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(onpagesizechange).toHaveBeenCalledWith(10);
		expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
	});
});

describe('sorting', () => {
	it('sorts rows when a sortable header is clicked', () => {
		const { table } = setup();

		const header = table.querySelector('button.ssdg-sort') as HTMLButtonElement;
		header.click();
		flushSync();

		const names = [...table.querySelectorAll('td[data-col="0"]')].map((cell) => cell.textContent);
		expect(names).toEqual(['Alice', 'Bob', 'Carol']);

		header.click();
		flushSync();

		const reversed = [...table.querySelectorAll('td[data-col="0"]')].map(
			(cell) => cell.textContent
		);
		expect(reversed).toEqual(['Carol', 'Bob', 'Alice']);
	});
});

describe('context menu', () => {
	it('opens on right click and renders custom items', () => {
		const { cell } = setup({
			editable: true,
			contextMenuItems: ({ row, defaultItems }) => [
				...defaultItems,
				{ id: 'custom', label: `Custom ${row?.name}` }
			]
		});

		cell(1, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })
		);
		flushSync();

		const menu = document.querySelector('[role="menu"]') as HTMLElement;
		const labels = [...menu.querySelectorAll('button')].map((button) => button.textContent?.trim());

		expect(labels).toEqual(['Copy', 'Cut', 'Paste', 'Clear', 'Select all', 'Custom Bob']);
	});

	it('runs the item action and closes the menu', () => {
		const action = vi.fn();
		const { cell } = setup({ contextMenuItems: () => [{ id: 'run', label: 'Run', action }] });

		cell(0, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
		);
		flushSync();

		const item = document.querySelector('[role="menuitem"]') as HTMLButtonElement;
		item.click();
		flushSync();

		expect(action).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[role="menu"]')).toBeNull();
	});
});

describe('column resizing', () => {
	function resizer(table: HTMLTableElement, index: number) {
		return table.querySelectorAll<HTMLButtonElement>('.ssdg-resizer')[index];
	}

	function col(table: HTMLTableElement, index: number) {
		return table.querySelector<HTMLElement>(`col[data-col="${index}"]`) as HTMLElement;
	}

	it('renders a handle per resizable column', () => {
		const { table } = setup();
		expect(table.querySelectorAll('.ssdg-resizer')).toHaveLength(2);
	});

	it('can be disabled for the grid or a single column', () => {
		const plain = setup({ resizable: false });
		expect(plain.table.querySelectorAll('.ssdg-resizer')).toHaveLength(0);
		if (component) unmount(component);
		component = null;

		const mixed = setup({
			columns: [
				{ id: 'name', header: 'Name', value: (row: Person) => row.name, resizable: false },
				{ id: 'age', header: 'Age', value: (row: Person) => row.age }
			]
		});
		expect(mixed.table.querySelectorAll('.ssdg-resizer')).toHaveLength(1);
	});

	it('applies the given column widths', () => {
		const { table } = setup({ columnWidths: { name: 140 } });

		expect(col(table, 0).style.width).toBe('140px');
		expect(col(table, 1).style.width).toBe('');
	});

	it('resizes by dragging the handle', () => {
		const oncolumnresize = vi.fn();
		const { table } = setup({ columnWidths: { name: 100 }, oncolumnresize });

		resizer(table, 0).dispatchEvent(
			new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200 })
		);
		window.dispatchEvent(new MouseEvent('pointermove', { clientX: 260 }));
		flushSync();

		expect(col(table, 0).style.width).toBe('160px');
		expect(oncolumnresize).not.toHaveBeenCalled();

		window.dispatchEvent(new MouseEvent('pointerup'));
		flushSync();

		expect(oncolumnresize).toHaveBeenCalledWith({ columnId: 'name', width: 160 });
	});

	it('stops shrinking at the minimum width', () => {
		const { table } = setup({
			columnWidths: { name: 100 },
			columns: [
				{ id: 'name', header: 'Name', value: (row: Person) => row.name, minWidth: 60 },
				{ id: 'age', header: 'Age', value: (row: Person) => row.age }
			]
		});

		resizer(table, 0).dispatchEvent(
			new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200 })
		);
		window.dispatchEvent(new MouseEvent('pointermove', { clientX: 20 }));
		flushSync();

		expect(col(table, 0).style.width).toBe('60px');
	});

	it('ignores pointer moves after the drag ends', () => {
		const { table } = setup({ columnWidths: { name: 100 } });

		resizer(table, 0).dispatchEvent(
			new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200 })
		);
		window.dispatchEvent(new MouseEvent('pointerup'));
		window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400 }));
		flushSync();

		expect(col(table, 0).style.width).toBe('100px');
	});

	it('resizes with the arrow keys', () => {
		const oncolumnresize = vi.fn();
		const { table } = setup({ columnWidths: { name: 100 }, oncolumnresize });

		keydown(resizer(table, 0), 'ArrowRight');
		expect(col(table, 0).style.width).toBe('108px');

		keydown(resizer(table, 0), 'ArrowLeft', { shiftKey: true });
		expect(col(table, 0).style.width).toBe('68px');
		expect(oncolumnresize).toHaveBeenLastCalledWith({ columnId: 'name', width: 68 });
	});

	it('keeps a trailing spacer cell out of the grid model', () => {
		const { table, cell } = setup();

		expect(table.querySelectorAll('tbody tr:first-child td')).toHaveLength(3);
		expect(table.querySelectorAll('tbody tr:first-child td[data-col]')).toHaveLength(2);
		expect(cell(0, 1).nextElementSibling?.classList.contains('ssdg-spacer')).toBe(true);
	});
});

describe('bottom bar', () => {
	it('is hidden by default without pagination', () => {
		const { target } = setup();
		expect(target.querySelector('.ssdg-bottom-bar')).toBeNull();
	});

	it('is shown by default with pagination', () => {
		const { target } = setup({ paginated: true, pageSize: 2 });
		expect(target.querySelector('.ssdg-bottom-bar')).not.toBeNull();
	});

	it('can be hidden while pagination stays active', () => {
		const { target, table } = setup({ paginated: true, pageSize: 2, bottomBar: false });

		expect(target.querySelector('.ssdg-bottom-bar')).toBeNull();
		expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
	});

	it('can be shown without pagination', () => {
		const { target } = setup({ bottomBar: true });

		expect(target.querySelector('.ssdg-bottom-bar')?.textContent).toContain('3 rows');
		expect(target.querySelector('select')).toBeNull();
	});
});

describe('export', () => {
	it('adds export items to the context menu when enabled', () => {
		const { cell } = setup({ exportable: true });

		cell(0, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
		);
		flushSync();

		const labels = [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
			item.textContent?.trim()
		);
		expect(labels).toEqual(['Copy', 'Export CSV', 'Select all']);
	});

	it('offers XLSX only when an exporter is provided', () => {
		const xlsxExporter = vi.fn();
		const { cell } = setup({ exportable: true, xlsxExporter });

		cell(0, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
		);
		flushSync();

		const item = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
			(entry) => entry.textContent?.trim() === 'Export XLSX'
		);
		item?.click();
		flushSync();

		expect(xlsxExporter).toHaveBeenCalledWith(baseRows, columns, {
			filename: 'export.xlsx',
			sheetName: 'export'
		});
	});

	it('reports exporter failures', async () => {
		const onexporterror = vi.fn();
		const xlsxExporter = vi.fn(() => Promise.reject(new Error('missing writer')));
		const { cell } = setup({ exportable: true, xlsxExporter, onexporterror });

		cell(0, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
		);
		flushSync();

		const item = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
			(entry) => entry.textContent?.trim() === 'Export XLSX'
		);
		item?.click();
		await vi.waitFor(() => expect(onexporterror).toHaveBeenCalledTimes(1));

		expect((onexporterror.mock.calls[0][0] as Error).message).toBe('missing writer');
	});

	it('has no export items by default', () => {
		const { cell } = setup();

		cell(0, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
		);
		flushSync();

		const labels = [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
			item.textContent?.trim()
		);
		expect(labels).not.toContain('Export CSV');
	});

	it('downloads sorted rows with the configured filename', async () => {
		const blobs: Blob[] = [];
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, 'click')
			.mockImplementation(() => undefined);
		URL.createObjectURL = vi.fn((blob: Blob) => {
			blobs.push(blob);
			return 'blob:test';
		});
		URL.revokeObjectURL = vi.fn();

		const { table, cell } = setup({ exportable: true, exportFilename: 'people' });

		(table.querySelector('button.ssdg-sort') as HTMLButtonElement).click();
		flushSync();

		cell(0, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
		);
		flushSync();

		const csvItem = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
			(item) => item.textContent?.trim() === 'Export CSV'
		);
		csvItem?.click();
		flushSync();

		expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('people.csv');
		expect(await blobs[0].text()).toBe('Name,Age\r\nAlice,30\r\nBob,35\r\nCarol,25');

		click.mockRestore();
		vi.restoreAllMocks();
	});
});

describe('theming', () => {
	it('switches the theme class', () => {
		const { target } = setup({ theme: 'spreadsheet', class: 'my-grid' });

		const root = target.querySelector('.ssdg') as HTMLElement;
		expect(root.classList.contains('ssdg-theme-spreadsheet')).toBe(true);
		expect(root.classList.contains('my-grid')).toBe(true);
	});

	it('renders the context menu inside the themed root', () => {
		const { target, cell } = setup({ theme: 'spreadsheet' });

		cell(0, 0).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
		);
		flushSync();

		expect(target.querySelector('.ssdg-theme-spreadsheet [role="menu"]')).not.toBeNull();
	});
});

describe('custom rendering', () => {
	it('uses the column format function', () => {
		const { table } = setup({
			columns: [
				{ id: 'name', header: 'Name', value: (row: Person) => row.name },
				{
					id: 'age',
					header: 'Age',
					value: (row: Person) => row.age,
					format: (value) => `${value} yrs`
				}
			]
		});

		expect(table.textContent).toContain('30 yrs');
	});
});
