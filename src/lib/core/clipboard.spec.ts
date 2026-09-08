import { describe, expect, it } from 'vitest';
import { expandMatrix, parseTsv, toTsv } from './clipboard.js';

describe('toTsv', () => {
	it('joins cells with tabs and rows with newlines', () => {
		expect(
			toTsv([
				['a', 'b'],
				['c', 'd']
			])
		).toBe('a\tb\nc\td');
	});

	it('quotes cells containing separators or quotes', () => {
		expect(toTsv([['a\tb', 'c\nd', 'say "hi"']])).toBe('"a\tb"\t"c\nd"\t"say ""hi"""');
	});
});

describe('parseTsv', () => {
	it('parses a plain matrix', () => {
		expect(parseTsv('a\tb\nc\td')).toEqual([
			['a', 'b'],
			['c', 'd']
		]);
	});

	it('normalizes windows line endings', () => {
		expect(parseTsv('a\tb\r\nc\td')).toEqual([
			['a', 'b'],
			['c', 'd']
		]);
	});

	it('parses quoted cells', () => {
		expect(parseTsv('"a\tb"\t"c\nd"\t"say ""hi"""')).toEqual([['a\tb', 'c\nd', 'say "hi"']]);
	});

	it('drops a trailing empty row', () => {
		expect(parseTsv('a\tb\n')).toEqual([['a', 'b']]);
	});

	it('round-trips through toTsv', () => {
		const matrix = [
			['1', 'multi\nline'],
			['tab\there', '']
		];
		expect(parseTsv(toTsv(matrix))).toEqual(matrix);
	});
});

describe('expandMatrix', () => {
	it('fills the target size from a single cell', () => {
		expect(expandMatrix([['x']], 2, 3)).toEqual([
			['x', 'x', 'x'],
			['x', 'x', 'x']
		]);
	});

	it('keeps a multi cell matrix untouched', () => {
		const matrix = [['a', 'b']];
		expect(expandMatrix(matrix, 3, 3)).toBe(matrix);
	});
});
