<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnAlign, EditorMove } from '../core/types.js';

	interface Props {
		value: string;
		align?: ColumnAlign;
		oncommit: (text: string, move: EditorMove) => void;
		oncancel: () => void;
	}

	let { value, align = 'left', oncommit, oncancel }: Props = $props();

	let text = $state(untrack(() => value));
	let input = $state<HTMLInputElement | null>(null);
	let done = false;

	$effect(() => {
		input?.focus();
		input?.select();
	});

	function commit(move: EditorMove) {
		if (done) return;
		done = true;
		oncommit(text, move);
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

<input
	bind:this={input}
	bind:value={text}
	class="ssdg-editor"
	style:text-align={align}
	onkeydown={handleKeydown}
	onblur={() => commit(null)}
	oncopy={(event) => event.stopPropagation()}
	oncut={(event) => event.stopPropagation()}
	onpaste={(event) => event.stopPropagation()}
/>

<style>
	.ssdg-editor {
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
		user-select: text;
	}
</style>
