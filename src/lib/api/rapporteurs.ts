import { queryOData } from './odata';
import type { Locale, RapporteurRow } from './types';

export interface Rapporteur {
	businessId: number;
	businessShortNumber: string;
	personNumber: number;
	firstName: string;
	lastName: string;
}

export async function fetchRapporteurs(businessId: number, locale: Locale): Promise<Rapporteur[]> {
	const rows = await queryOData<RapporteurRow>(
		'Rapporteur',
		locale,
		`BusinessNumber eq ${businessId}`
	);
	return rows.map((row) => ({
		businessId: row.BusinessNumber,
		businessShortNumber: row.BusinessShortNumber,
		personNumber: row.MemberCouncilNumber,
		firstName: row.FirstName,
		lastName: row.LastName
	}));
}
