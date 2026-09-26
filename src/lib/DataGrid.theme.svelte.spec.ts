import { compile } from 'svelte/compiler';
import { afterEach, describe, expect, it } from 'vitest';
import source from './DataGrid.svelte?raw';

const componentCss = compile(source, { filename: 'DataGrid.svelte', css: 'external' }).css!.code;
const scope = componentCss.match(/svelte-[a-z0-9]+/)![0];

interface Setup {
	theme?: 'default' | 'spreadsheet';
	userCss?: string;
	userCssFirst?: boolean;
	style?: string;
}

function computed(
	property: string,
	{ theme = 'default', userCss = '', userCssFirst, style }: Setup
) {
	const sheets = [`<style>${componentCss}</style>`, `<style>${userCss}</style>`];
	if (userCssFirst) sheets.reverse();

	document.head.innerHTML = sheets.join('');
	document.body.innerHTML = `<main class="page">
		<div id="grid" class="ssdg ssdg-theme-${theme} my-grid ${scope}" style="${style ?? ''}"></div>
	</main>`;

	const grid = document.getElementById('grid')!;
	return getComputedStyle(grid).getPropertyValue(property).trim();
}

afterEach(() => {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
});

describe('DataGrid theme variables', () => {
	it('applies the built-in theme defaults', () => {
		expect(computed('--ssdg-accent-color', {})).toBe('#2563eb');
		expect(computed('--ssdg-accent-color', { theme: 'spreadsheet' })).toBe('#0091ea');
		expect(computed('--ssdg-row-height', { theme: 'spreadsheet' })).toBe('28px');
	});

	it('lets a single class override the defaults regardless of stylesheet order', () => {
		const userCss =
			'.ssdg-theme-spreadsheet { --ssdg-accent-color: #16a34a; --ssdg-row-height: 24px; }';

		for (const userCssFirst of [false, true]) {
			const setup: Setup = { theme: 'spreadsheet', userCss, userCssFirst };
			expect(computed('--ssdg-accent-color', setup)).toBe('#16a34a');
			expect(computed('--ssdg-row-height', setup)).toBe('24px');
		}

		const selectors = ['.ssdg', '.my-grid', '.page .ssdg'];
		for (const selector of selectors) {
			const setup: Setup = {
				theme: 'spreadsheet',
				userCss: `${selector} { --ssdg-bg: #111; }`,
				userCssFirst: true
			};
			expect(computed('--ssdg-bg', setup)).toBe('#111');
		}
	});

	it('lets inline styles override theme and user classes', () => {
		const setup: Setup = {
			theme: 'spreadsheet',
			userCss: '.ssdg-theme-spreadsheet { --ssdg-accent-color: #16a34a; }',
			style: '--ssdg-accent-color: #dc2626'
		};
		expect(computed('--ssdg-accent-color', setup)).toBe('#dc2626');
	});
});
