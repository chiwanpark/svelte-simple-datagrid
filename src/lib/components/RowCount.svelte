<script lang="ts">
	import type { BottomBarContext } from '../core/types.js';

	interface Props {
		context: BottomBarContext;
	}

	let { context }: Props = $props();

	let text = $derived(
		context.paginated && context.totalRows > 0
			? `${context.rangeStart}–${context.rangeEnd} of ${context.totalRows}`
			: `${context.totalRows} rows`
	);
</script>

<span class="ssdg-row-count">{text}</span>

<style>
	.ssdg-row-count {
		color: var(--ssdg-muted-color, #64748b);
	}
</style>
