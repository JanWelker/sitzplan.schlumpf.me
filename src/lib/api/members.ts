import { queryOData } from './odata';
import type { Locale, MemberCouncilRow } from './types';

const SELECT = [
	'PersonNumber',
	'FirstName',
	'LastName',
	'Council',
	'CouncilAbbreviation',
	'CantonAbbreviation',
	'ParlGroupNumber',
	'ParlGroupAbbreviation',
	'ParlGroupName'
];

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
 * Fallback lookup for people who don't appear in the current seat roster
 * (e.g. no longer seated). Used only to render a name/party in the
 * "unseated" list, never to place them on the chart. Fetches every given
 * person in one request.
 */
export async function fetchMemberCouncils(
	personNumbers: number[],
	locale: Locale
): Promise<MemberCouncil[]> {
	if (personNumbers.length === 0) return [];
	const filter = personNumbers.map((n) => `PersonNumber eq ${n}`).join(' or ');
	const rows = await queryOData<MemberCouncilRow>('MemberCouncil', locale, {
		filter,
		select: SELECT
	});
	return rows.map((row) => ({
		personNumber: row.PersonNumber,
		firstName: row.FirstName,
		lastName: row.LastName,
		council: row.Council,
		councilAbbreviation: row.CouncilAbbreviation,
		cantonAbbreviation: row.CantonAbbreviation,
		parlGroupNumber: row.ParlGroupNumber,
		parlGroupAbbreviation: row.ParlGroupAbbreviation,
		parlGroupName: row.ParlGroupName
	}));
}
