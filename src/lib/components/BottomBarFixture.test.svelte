<script lang="ts">
	import DataGrid from '../DataGrid.svelte';
	import type { BottomBarContext, Column } from '../core/types.js';
	import PageSizeSelect from './PageSizeSelect.svelte';
	import Pagination from './Pagination.svelte';
	import RowCount from './RowCount.svelte';
	import SelectionCount from './SelectionCount.svelte';

	interface Person {
		name: string;
		age: number;
	}

	interface Props {
		rows: Person[];
		columns: Column<Person>[];
		pageSize: number;
		onaction: () => void;
	}

	let { rows, columns, pageSize, onaction }: Props = $props();
</script>

<DataGrid {rows} {columns} paginated {pageSize} bottomBarContent={footer} />

{#snippet footer(context: BottomBarContext)}
	<RowCount {context} />
	<SelectionCount {context} />
	<button type="button" class="custom-action" onclick={onaction}>Refresh</button>
	<PageSizeSelect {context} />
	<Pagination page={context.page} pageCount={context.pageCount} onpage={context.setPage} />
{/snippet}
