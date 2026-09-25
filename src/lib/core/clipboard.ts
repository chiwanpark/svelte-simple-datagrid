export function toTsv(matrix: string[][]): string {
	return matrix
		.map((row) =>
			row
				.map((cell) => (/[\t\n\r"]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell))
				.join('\t')
		)
		.join('\n');
}

export function parseTsv(text: string): string[][] {
	const normalized = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
	const matrix: string[][] = [];

	let row: string[] = [];
	let cell = '';
	let quoted = false;

	for (let index = 0; index < normalized.length; index += 1) {
		const char = normalized[index];

		if (quoted) {
			if (char === '"') {
				if (normalized[index + 1] === '"') {
					cell += '"';
					index += 1;
				} else {
					quoted = false;
				}
			} else {
				cell += char;
			}
			continue;
		}

		if (char === '"' && cell === '') {
			quoted = true;
		} else if (char === '\t') {
			row.push(cell);
			cell = '';
		} else if (char === '\n') {
			row.push(cell);
			matrix.push(row);
			row = [];
			cell = '';
		} else {
			cell += char;
		}
	}

	row.push(cell);
	matrix.push(row);

	while (matrix.length > 1 && matrix.at(-1)?.every((value) => value === '')) {
		matrix.pop();
	}

	return matrix;
}

export function expandMatrix(matrix: string[][], rows: number, columns: number): string[][] {
	if (matrix.length === 0) return matrix;
	if (matrix.length !== 1 || matrix[0].length !== 1) return matrix;

	const value = matrix[0][0];
	return Array.from(
		{ length: Math.max(rows, 1) },
		() => Array.from({ length: Math.max(columns, 1) }, () => value)
	);
}
