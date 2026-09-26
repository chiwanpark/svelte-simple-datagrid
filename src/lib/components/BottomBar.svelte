<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { BottomBarContext } from '../core/types.js';
	import PageSizeSelect from './PageSizeSelect.svelte';
	import Pagination from './Pagination.svelte';
	import RowCount from './RowCount.svelte';
	import SelectionCount from './SelectionCount.svelte';

	interface Props {
		context: BottomBarContext;
		content?: Snippet<[BottomBarContext]>;
	}

	let { context, content }: Props = $props();
</script>

<div class="ssdg-bottom-bar">
	{#if content}
		{@render content(context)}
	{:else}
		<div class="ssdg-bottom-info">
			<RowCount {context} />
			<SelectionCount {context} />
		</div>

		{#if context.paginated}
			<div class="ssdg-bottom-controls">
				<PageSizeSelect {context} />
				<Pagination
					page={context.page}
					pageCount={context.pageCount}
					onpage={(page) => context.setPage(page)}
				/>
			</div>
		{/if}
	{/if}
</div>

<style>
	.ssdg-bottom-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.375rem 1rem;
		padding: 0.375rem 0.625rem;
		border-top: 1px solid var(--ssdg-border-color, #e2e8f0);
		background: var(--ssdg-bottom-bar-bg, #f8fafc);
		font-size: var(--ssdg-font-size, 0.875rem);
	}

	.ssdg-bottom-info {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.75rem;
	}

	.ssdg-bottom-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	@container ssdg-bottom (width < 30rem) {
		.ssdg-bottom-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.ssdg-bottom-info,
		.ssdg-bottom-controls {
			justify-content: space-between;
		}
	}
</style>
