import { queryOData } from './odata';
import type { Locale, MemberCouncilRow } from './types';

export interface MemberCouncil {
	personNumber: number;
	firstName: string;
	lastName: string;
	council: number | null;
	councilAbbreviation: string | null;
	cantonAbbreviation: string | null;
	parlGroupNumber: number | null;
	parlGroupAbbreviation: string | null;
	parlGroupName: string | null;
}

/**
 * Fallback lookup for a person who doesn't appear in the current seat
 * roster (e.g. no longer seated). Used only to render a name/party in the
 * "unseated" list, never to place them on the chart.
 */
export async function fetchMemberCouncil(
	personNumber: number,
	locale: Locale
): Promise<MemberCouncil | null> {
	const rows = await queryOData<MemberCouncilRow>(
		'MemberCouncil',
		locale,
		`PersonNumber eq ${personNumber}`
	);
	const row = rows[0];
	if (!row) return null;
	return {
		personNumber: row.PersonNumber,
		firstName: row.FirstName,
		lastName: row.LastName,
		council: row.Council,
		councilAbbreviation: row.CouncilAbbreviation,
		cantonAbbreviation: row.CantonAbbreviation,
		parlGroupNumber: row.ParlGroupNumber,
		parlGroupAbbreviation: row.ParlGroupAbbreviation,
		parlGroupName: row.ParlGroupName
	};
}
