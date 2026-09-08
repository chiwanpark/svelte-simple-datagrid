<script lang="ts">
	import type { ColumnAlign, EditorMove, SelectOptionItem } from '../core/types.js';

	interface Props {
		value: unknown;
		options: SelectOptionItem[];
		align?: ColumnAlign;
		oncommit: (value: unknown, move: EditorMove) => void;
		oncancel: () => void;
	}

	let { value, options, align = 'left', oncommit, oncancel }: Props = $props();

	let select = $state<HTMLSelectElement | null>(null);
	let done = false;

	let selectedIndex = $derived(options.findIndex((option) => Object.is(option.value, value)));

	$effect(() => {
		const element = select;
		if (!element) return;

		element.focus();
		Promise.resolve()
			.then(() => element.showPicker())
			.catch(() => undefined);
	});

	function commit(move: EditorMove) {
		if (done) return;

		const index = Number(select?.value);
		if (!Number.isInteger(index) || index < 0 || index >= options.length) {
			cancel();
			return;
		}

		done = true;
		oncommit(options[index].value, move);
	}

	function cancel() {
		if (done) return;
		done = true;
		oncancel();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit('down');
		} else if (event.key === 'Tab') {
			event.preventDefault();
			commit(event.shiftKey ? 'left' : 'right');
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
		}
		event.stopPropagation();
	}
</script>

<select
	bind:this={select}
	class="ssdg-editor-select"
	style:text-align={align}
	value={String(selectedIndex)}
	onchange={() => commit(null)}
	onkeydown={handleKeydown}
	onblur={cancel}
>
	{#if selectedIndex < 0}
		<option value="-1" disabled></option>
	{/if}
	{#each options as option, index (index)}
		<option value={String(index)} disabled={option.disabled}>{option.label}</option>
	{/each}
</select>

<style>
	.ssdg-editor-select {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0 var(--ssdg-cell-padding, 0.5rem);
		border: none;
		outline: none;
		background: var(--ssdg-editor-bg, #fff);
		color: inherit;
		font: inherit;
	}
</style>
