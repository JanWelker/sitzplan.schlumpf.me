import { queryOData } from './odata';
import type { BusinessRoleRow, Locale } from './types';

/** Confirmed live against the API: 7 = Urheber(-in) (submitter), 1 = Bekämpfer(-in) (contester). */
const SUBMITTER_ROLE = 7;
const CONTESTER_ROLE = 1;

const SELECT = [
	'BusinessNumber',
	'BusinessShortNumber',
	'Role',
	'MemberCouncilNumber',
	'CommitteeNumber',
	'ParlGroupNumber'
];

export type RoleKind = 'submitter' | 'contester';

export interface RoleHolder {
	kind: RoleKind;
	businessId: number;
	businessShortNumber: string;
	personNumber: number | null;
	committeeNumber: number | null;
	parlGroupNumber: number | null;
}

/** Fetches submitter/contester roles for every given business in one request. */
export async function fetchBusinessRolesForBusinesses(
	businessIds: number[],
	locale: Locale
): Promise<RoleHolder[]> {
	if (businessIds.length === 0) return [];
	const businessClause = businessIds.map((id) => `BusinessNumber eq ${id}`).join(' or ');
	const filter = `(${businessClause}) and (Role eq ${SUBMITTER_ROLE} or Role eq ${CONTESTER_ROLE})`;
	const rows = await queryOData<BusinessRoleRow>('BusinessRole', locale, {
		filter,
		select: SELECT
	});
	return rows.map((row) => ({
		kind: row.Role === CONTESTER_ROLE ? 'contester' : 'submitter',
		businessId: row.BusinessNumber,
		businessShortNumber: row.BusinessShortNumber,
		personNumber: row.MemberCouncilNumber,
		committeeNumber: row.CommitteeNumber,
		parlGroupNumber: row.ParlGroupNumber
	}));
}
