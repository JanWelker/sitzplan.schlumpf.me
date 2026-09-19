import { queryOData } from './odata';
import type { BusinessRow, Locale } from './types';

export interface Business {
	id: number;
	shortNumber: string;
	title: string;
	businessTypeName: string;
}

const SELECT = ['ID', 'BusinessShortNumber', 'Title', 'BusinessTypeName'];

/** Escapes a single-quote in an OData string literal by doubling it. */
function escapeODataString(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Fetches every business in one request via an OR-combined filter (instead
 * of one request per short number) — confirmed live to work and to keep
 * response time flat regardless of how many numbers are searched at once.
 * Short numbers not found simply don't appear in the result; the caller
 * diffs against the input to report which ones weren't found.
 */
export async function fetchBusinesses(shortNumbers: string[], locale: Locale): Promise<Business[]> {
	if (shortNumbers.length === 0) return [];
	const filter = shortNumbers
		.map((n) => `BusinessShortNumber eq '${escapeODataString(n)}'`)
		.join(' or ');
	const rows = await queryOData<BusinessRow>('Business', locale, { filter, select: SELECT });
	return rows.map((row) => ({
		id: row.ID,
		shortNumber: row.BusinessShortNumber,
		title: row.Title,
		businessTypeName: row.BusinessTypeName
	}));
}
