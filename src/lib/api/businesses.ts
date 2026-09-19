import { queryOData } from './odata';
import type { BusinessRow, Locale } from './types';

export interface Business {
	id: number;
	shortNumber: string;
	title: string;
	businessTypeName: string;
}

/** Escapes a single-quote in an OData string literal by doubling it. */
function escapeODataString(value: string): string {
	return value.replace(/'/g, "''");
}

export async function fetchBusiness(shortNumber: string, locale: Locale): Promise<Business | null> {
	const rows = await queryOData<BusinessRow>(
		'Business',
		locale,
		`BusinessShortNumber eq '${escapeODataString(shortNumber)}'`
	);
	const row = rows[0];
	if (!row) return null;
	return {
		id: row.ID,
		shortNumber: row.BusinessShortNumber,
		title: row.Title,
		businessTypeName: row.BusinessTypeName
	};
}
