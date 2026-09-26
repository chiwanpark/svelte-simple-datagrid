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

function render({ theme = 'default', userCss = '', userCssFirst, style }: Setup) {
	const sheets = [`<style>${componentCss}</style>`, `<style>${userCss}</style>`];
	if (userCssFirst) sheets.reverse();

	document.head.innerHTML = sheets.join('');
	document.body.innerHTML = `<main class="page">
		<div id="grid" class="ssdg ssdg-theme-${theme} my-grid ${scope}" style="${style ?? ''}">
			<table class="ssdg-table ${scope}">
				<thead class="${scope}">
					<tr class="${scope}">
						<th id="row-number-header" class="ssdg-row-number ${scope}"></th>
						<th id="header" class="${scope}"></th>
					</tr>
				</thead>
				<tbody class="${scope}">
					<tr class="${scope}">
						<th id="row-number" class="ssdg-row-number ${scope}"></th>
						<td class="${scope}"></td>
					</tr>
				</tbody>
			</table>
		</div>
	</main>`;
}

function computed(property: string, setup: Setup) {
	render(setup);
	const grid = document.getElementById('grid')!;
	return getComputedStyle(grid).getPropertyValue(property).trim();
}

function fontWeight(id: string) {
	const style = getComputedStyle(document.getElementById(id)!);
	const variable = style.fontWeight.match(/^var\((--[\w-]+)\)$/)?.[1];
	return variable ? style.getPropertyValue(variable).trim() : style.fontWeight;
}

function fontWeights(setup: Setup) {
	render(setup);
	return {
		header: fontWeight('header'),
		rowNumberHeader: fontWeight('row-number-header'),
		rowNumber: fontWeight('row-number')
	};
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

	it('applies the default header and row number font weights', () => {
		for (const theme of ['default', 'spreadsheet'] as const) {
			expect(fontWeights({ theme })).toEqual({
				header: '600',
				rowNumberHeader: '600',
				rowNumber: '400'
			});
		}
	});

	it('lets the header and row number font weights be overridden', () => {
		const variables = '--ssdg-header-font-weight: 500; --ssdg-row-number-font-weight: 700';
		const expected = { header: '500', rowNumberHeader: '500', rowNumber: '700' };

		expect(fontWeights({ style: variables })).toEqual(expected);
		for (const userCssFirst of [false, true]) {
			const setup: Setup = {
				theme: 'spreadsheet',
				userCss: `.my-grid { ${variables} }`,
				userCssFirst
			};
			expect(fontWeights(setup)).toEqual(expected);
		}
	});
});
