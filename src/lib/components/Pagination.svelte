<script lang="ts">
	import { pageNumbers } from '../core/pagination.js';

	interface Props {
		page: number;
		pageCount: number;
		maxButtons?: number;
		onpage: (page: number) => void;
	}

	let { page, pageCount, maxButtons = 5, onpage }: Props = $props();

	let numbers = $derived(pageNumbers(page, pageCount, maxButtons));
</script>

<nav class="ssdg-pagination" aria-label="Pagination">
	<button
		type="button"
		class="ssdg-page-edge"
		disabled={page <= 1}
		onclick={() => onpage(1)}
		aria-label="First page"
	>
		«
	</button>
	<button
		type="button"
		disabled={page <= 1}
		onclick={() => onpage(page - 1)}
		aria-label="Previous page"
	>
		‹
	</button>

	{#each numbers as number (number)}
		<button
			type="button"
			class="ssdg-page-number"
			class:active={number === page}
			aria-current={number === page ? 'page' : undefined}
			onclick={() => onpage(number)}
		>
			{number}
		</button>
	{/each}

	<span class="ssdg-page-total" aria-hidden="true">/ {pageCount}</span>

	<button
		type="button"
		disabled={page >= pageCount}
		onclick={() => onpage(page + 1)}
		aria-label="Next page"
	>
		›
	</button>
	<button
		type="button"
		class="ssdg-page-edge"
		disabled={page >= pageCount}
		onclick={() => onpage(pageCount)}
		aria-label="Last page"
	>
		»
	</button>
</nav>

<style>
	.ssdg-pagination {
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	button {
		min-width: 1.75rem;
		height: 1.75rem;
		padding: 0 0.375rem;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		background: none;
		color: inherit;
		font: inherit;
		line-height: 1;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		background: var(--ssdg-menu-hover-bg, #f1f5f9);
	}

	button:disabled {
		color: var(--ssdg-muted-color, #94a3b8);
		cursor: default;
	}

	button.active {
		border-color: var(--ssdg-accent-color, #2563eb);
		color: var(--ssdg-accent-color, #2563eb);
		font-weight: 600;
	}

	.ssdg-page-total {
		display: none;
		color: var(--ssdg-muted-color, #64748b);
	}

	@container ssdg-bottom (width < 26rem) {
		.ssdg-page-number:not(.active) {
			display: none;
		}

		.ssdg-page-total {
			display: inline;
			margin-right: 0.125rem;
		}
	}

	@container ssdg-bottom (width < 20rem) {
		.ssdg-page-edge {
			display: none;
		}

		button {
			min-width: 2rem;
			height: 2rem;
		}
	}
</style>
