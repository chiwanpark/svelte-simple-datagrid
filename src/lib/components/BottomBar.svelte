<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { BottomBarContext } from '../core/types.js';
	import Pagination from './Pagination.svelte';

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
			{#if context.paginated && context.totalRows > 0}
				<span>{context.rangeStart}–{context.rangeEnd} of {context.totalRows}</span>
			{:else}
				<span>{context.totalRows} rows</span>
			{/if}
			{#if context.selectedCount > 1}
				<span class="ssdg-bottom-selected">{context.selectedCount} cells selected</span>
			{/if}
		</div>

		{#if context.paginated}
			<div class="ssdg-bottom-controls">
				{#if context.pageSizeOptions.length > 0}
					<label class="ssdg-page-size">
						<span class="ssdg-page-size-label">Rows</span>
						<select
							value={context.pageSize}
							onchange={(event) => context.setPageSize(Number(event.currentTarget.value))}
						>
							{#each context.pageSizeOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</label>
				{/if}
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
		color: var(--ssdg-muted-color, #64748b);
	}

	.ssdg-bottom-selected {
		color: var(--ssdg-accent-color, #2563eb);
	}

	.ssdg-bottom-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.ssdg-page-size {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--ssdg-muted-color, #64748b);
	}

	.ssdg-page-size select {
		height: 1.75rem;
		border: 1px solid var(--ssdg-border-color, #e2e8f0);
		border-radius: 0.25rem;
		background: var(--ssdg-menu-bg, #fff);
		color: inherit;
		font: inherit;
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

	@container ssdg-bottom (width < 20rem) {
		.ssdg-page-size-label {
			display: none;
		}

		.ssdg-page-size select {
			height: 2rem;
		}
	}
</style>
