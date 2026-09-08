import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import DataGrid from './DataGrid.svelte';
import type { Column, DataGridProps } from './core/types.js';

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
	{ id: 'name', header: 'Name', value: (row) => row.name, sortable: true },
	{ id: 'age', header: 'Age', value: (row) => row.age, align: 'right' }
];

const Grid = DataGrid as unknown as Component<DataGridProps<Person>>;

describe('DataGrid rendering', () => {
	it('renders headers and cells', () => {
		const { body } = render(Grid, { props: { rows, columns } });

		expect(body).toContain('Name');
		expect(body).toContain('Alice');
		expect(body).toContain('35');
		expect(body).toContain('role="grid"');
	});

	it('applies the default theme class', () => {
		const { body } = render(Grid, { props: { rows, columns } });
		expect(body).toContain('ssdg-theme-default');
	});

	it('applies the spreadsheet theme class', () => {
		const { body } = render(Grid, { props: { rows, columns, theme: 'spreadsheet' } });
		expect(body).toContain('ssdg-theme-spreadsheet');
		expect(body).not.toContain('ssdg-theme-default');
	});

	it('renders the empty message', () => {
		const { body } = render(Grid, { props: { rows: [], columns, emptyMessage: 'Nothing' } });
		expect(body).toContain('Nothing');
	});

	it('renders only the current page and a bottom bar when paginated', () => {
		const { body } = render(Grid, {
			props: { rows, columns, paginated: true, pageSize: 2 }
		});

		expect(body).toContain('Alice');
		expect(body).not.toContain('Carol');
		expect(body).toContain('1–2 of 3');
	});
});
