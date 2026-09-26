import { flushSync, mount, unmount, type Component } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BottomBarContext, Column } from '../core/types.js';
import BottomBarFixture from './BottomBarFixture.test.svelte';
import PageSizeSelect from './PageSizeSelect.svelte';
import RowCount from './RowCount.svelte';
import SelectionCount from './SelectionCount.svelte';

interface Person {
	name: string;
	age: number;
}

const rows: Person[] = [
	{ name: 'Alice', age: 30 },
	{ name: 'Bob', age: 35 },
	{ name: 'Carol', age: 25 }
];

const columns: Column<Person>[] = [
	{ id: 'name', header: 'Name', value: (row) => row.name },
	{ id: 'age', header: 'Age', value: (row) => row.age }
];

let component: Record<string, unknown> | null = null;

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

function context(overrides: Partial<BottomBarContext> = {}): BottomBarContext {
	return {
		page: 1,
		pageCount: 3,
		pageSize: 20,
		pageSizeOptions: [10, 20, 50],
		totalRows: 57,
		rangeStart: 1,
		rangeEnd: 20,
		selectedCount: 0,
		paginated: true,
		setPage: vi.fn(),
		setPageSize: vi.fn(),
		...overrides
	};
}

function render<TProps extends Record<string, unknown>>(part: Component<TProps>, props: TProps) {
	const target = document.createElement('div');
	document.body.append(target);
	component = mount(part, { target, props });
	flushSync();
	return target;
}

describe('RowCount', () => {
	it('shows the visible range when paginated', () => {
		const target = render(RowCount, { context: context() });
		expect(target.textContent).toBe('1–20 of 57');
	});

	it('shows the total without pagination', () => {
		const target = render(RowCount, { context: context({ paginated: false }) });
		expect(target.textContent).toBe('57 rows');
	});

	it('shows the total for an empty paginated grid', () => {
		const target = render(RowCount, {
			context: context({ totalRows: 0, rangeStart: 0, rangeEnd: 0 })
		});
		expect(target.textContent).toBe('0 rows');
	});
});

describe('SelectionCount', () => {
	it('renders nothing for a single cell', () => {
		const target = render(SelectionCount, { context: context({ selectedCount: 1 }) });
		expect(target.textContent).toBe('');
	});

	it('shows the number of selected cells', () => {
		const target = render(SelectionCount, { context: context({ selectedCount: 6 }) });
		expect(target.textContent).toBe('6 cells selected');
	});
});

describe('PageSizeSelect', () => {
	it('lists the options and selects the current page size', () => {
		const target = render(PageSizeSelect, { context: context() });
		const select = target.querySelector('select') as HTMLSelectElement;

		expect([...select.options].map((option) => option.value)).toEqual(['10', '20', '50']);
		expect(select.value).toBe('20');
	});

	it('reports the new page size as a number', () => {
		const setPageSize = vi.fn();
		const target = render(PageSizeSelect, { context: context({ setPageSize }) });

		const select = target.querySelector('select') as HTMLSelectElement;
		select.value = '50';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(setPageSize).toHaveBeenCalledWith(50);
	});

	it('renders nothing without options', () => {
		const target = render(PageSizeSelect, { context: context({ pageSizeOptions: [] }) });
		expect(target.querySelector('select')).toBeNull();
	});
});

describe('custom bottom bar content', () => {
	function setup() {
		const onaction = vi.fn();
		const target = render(BottomBarFixture, { rows, columns, pageSize: 2, onaction });
		const bar = target.querySelector('.ssdg-bottom-bar') as HTMLElement;
		const table = target.querySelector('table') as HTMLTableElement;
		return { target, bar, table, onaction };
	}

	it('renders the default parts next to custom content', () => {
		const { bar, onaction } = setup();

		expect(bar.textContent).toContain('1–2 of 3');
		expect(bar.querySelector('select')).not.toBeNull();
		expect(bar.querySelector('nav[aria-label="Pagination"]')).not.toBeNull();

		(bar.querySelector('.custom-action') as HTMLButtonElement).click();
		expect(onaction).toHaveBeenCalledTimes(1);
	});

	it('keeps the parts in sync with the grid', () => {
		const { bar, table } = setup();

		(bar.querySelector('button[aria-label="Next page"]') as HTMLButtonElement).click();
		flushSync();
		expect(bar.textContent).toContain('3–3 of 3');

		const select = bar.querySelector('select') as HTMLSelectElement;
		select.value = '10';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		expect(bar.textContent).toContain('1–3 of 3');

		const cell = (row: number, column: number) =>
			table.querySelector(`td[data-row="${row}"][data-col="${column}"]`) as HTMLElement;
		cell(0, 0).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
		cell(1, 1).dispatchEvent(new MouseEvent('pointerenter'));
		window.dispatchEvent(new MouseEvent('pointerup'));
		flushSync();
		expect(bar.textContent).toContain('4 cells selected');
	});
});
