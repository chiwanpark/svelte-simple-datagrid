<script lang="ts">
	import type { BottomBarContext } from '../core/types.js';

	interface Props {
		context: BottomBarContext;
	}

	let { context }: Props = $props();
</script>

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

<style>
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

	@container ssdg-bottom (width < 20rem) {
		.ssdg-page-size-label {
			display: none;
		}

		.ssdg-page-size select {
			height: 2rem;
		}
	}
</style>
