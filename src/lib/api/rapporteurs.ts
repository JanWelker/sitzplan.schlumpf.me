import { queryOData } from './odata';
import type { Locale, RapporteurRow } from './types';

const SELECT = [
	'BusinessNumber',
	'BusinessShortNumber',
	'MemberCouncilNumber',
	'FirstName',
	'LastName'
];

export interface Rapporteur {
	businessId: number;
	businessShortNumber: string;
	personNumber: number;
	firstName: string;
	lastName: string;
}

/** Fetches rapporteurs for every given business in one request. */
export async function fetchRapporteursForBusinesses(
	businessIds: number[],
	locale: Locale
): Promise<Rapporteur[]> {
	if (businessIds.length === 0) return [];
	const filter = businessIds.map((id) => `BusinessNumber eq ${id}`).join(' or ');
	const rows = await queryOData<RapporteurRow>('Rapporteur', locale, { filter, select: SELECT });
	return rows.map((row) => ({
		businessId: row.BusinessNumber,
		businessShortNumber: row.BusinessShortNumber,
		personNumber: row.MemberCouncilNumber,
		firstName: row.FirstName,
		lastName: row.LastName
	}));
}
