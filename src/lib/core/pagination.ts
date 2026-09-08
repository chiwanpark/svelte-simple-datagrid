export function pageCount(totalRows: number, pageSize: number): number {
	if (pageSize <= 0) return 1;
	return Math.max(1, Math.ceil(totalRows / pageSize));
}

export function clampPage(page: number, totalRows: number, pageSize: number): number {
	const count = pageCount(totalRows, pageSize);
	if (!Number.isFinite(page)) return 1;
	return Math.min(Math.max(Math.trunc(page), 1), count);
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	if (pageSize <= 0) return items;
	const current = clampPage(page, items.length, pageSize);
	const start = (current - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

export function pageRange(
	page: number,
	totalRows: number,
	pageSize: number
): { start: number; end: number } {
	if (totalRows === 0) return { start: 0, end: 0 };
	if (pageSize <= 0) return { start: 1, end: totalRows };

	const current = clampPage(page, totalRows, pageSize);
	const start = (current - 1) * pageSize + 1;
	return { start, end: Math.min(start + pageSize - 1, totalRows) };
}

export function pageNumbers(page: number, count: number, maxButtons = 5): number[] {
	const total = Math.max(1, count);
	const size = Math.min(maxButtons, total);
	const current = Math.min(Math.max(page, 1), total);

	let start = current - Math.floor(size / 2);
	start = Math.max(1, Math.min(start, total - size + 1));

	return Array.from({ length: size }, (_, index) => start + index);
}
