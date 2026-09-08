<script lang="ts">
	import type { ContextMenuItem } from '../core/types.js';

	interface Props {
		x: number;
		y: number;
		items: ContextMenuItem[];
		onclose: () => void;
	}

	let { x, y, items, onclose }: Props = $props();

	let menu = $state<HTMLDivElement | null>(null);
	let size = $state.raw<{ width: number; height: number } | null>(null);

	let left = $derived(
		size && x + size.width > window.innerWidth ? Math.max(0, window.innerWidth - size.width - 4) : x
	);
	let top = $derived(
		size && y + size.height > window.innerHeight ? Math.max(0, y - size.height) : y
	);

	$effect(() => {
		if (!menu) return;

		const rect = menu.getBoundingClientRect();
		size = { width: rect.width, height: rect.height };

		menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
	});

	function handleWindowPointerDown(event: PointerEvent) {
		if (menu && !menu.contains(event.target as Node)) onclose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
			return;
		}

		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

		event.preventDefault();
		const buttons = [...(menu?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
		if (buttons.length === 0) return;

		const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
		const delta = event.key === 'ArrowDown' ? 1 : -1;
		const next = (current + delta + buttons.length) % buttons.length;
		buttons[next].focus();
	}

	function select(item: ContextMenuItem) {
		if (item.disabled || item.separator) return;
		item.action?.();
		onclose();
	}
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onresize={onclose} />

<div
	bind:this={menu}
	class="ssdg-context-menu"
	role="menu"
	tabindex="-1"
	style:left="{left}px"
	style:top="{top}px"
	onkeydown={handleKeydown}
>
	{#each items as item, index (item.id ?? index)}
		{#if item.separator}
			<div class="ssdg-context-separator" role="separator"></div>
		{:else}
			<button
				type="button"
				role="menuitem"
				class="ssdg-context-item"
				disabled={item.disabled}
				onclick={() => select(item)}
			>
				{item.label}
			</button>
		{/if}
	{/each}
</div>

<style>
	.ssdg-context-menu {
		position: fixed;
		z-index: 100;
		min-width: 10rem;
		padding: 0.25rem;
		border: 1px solid var(--ssdg-border-color, #e2e8f0);
		border-radius: 0.375rem;
		background: var(--ssdg-menu-bg, #fff);
		box-shadow: 0 8px 24px rgb(15 23 42 / 15%);
		font-size: var(--ssdg-font-size, 0.875rem);
	}

	.ssdg-context-item {
		display: block;
		width: 100%;
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 0.25rem;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.ssdg-context-item:hover:not(:disabled),
	.ssdg-context-item:focus-visible {
		background: var(--ssdg-menu-hover-bg, #f1f5f9);
		outline: none;
	}

	.ssdg-context-item:disabled {
		color: var(--ssdg-muted-color, #94a3b8);
		cursor: default;
	}

	.ssdg-context-separator {
		height: 1px;
		margin: 0.25rem 0.25rem;
		background: var(--ssdg-border-color, #e2e8f0);
	}
</style>
