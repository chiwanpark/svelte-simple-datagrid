<script lang="ts">
	import type { BottomBarContext } from '../core/types.js';

	interface Props {
		context: BottomBarContext;
	}

	let { context }: Props = $props();
</script>

{#if context.selectedCount > 1}
	<span class="ssdg-bottom-selected">{context.selectedCount} cells selected</span>
{/if}

<style>
	.ssdg-bottom-selected {
		color: var(--ssdg-accent-color, #2563eb);
	}
</style>
