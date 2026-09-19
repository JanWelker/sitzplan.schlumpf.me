import { queryOData } from './odata';
import type { BusinessRoleRow, Locale } from './types';

/** Confirmed live against the API: 7 = Urheber(-in) (submitter), 1 = Bekämpfer(-in) (contester). */
const SUBMITTER_ROLE = 7;
const CONTESTER_ROLE = 1;

export type RoleKind = 'submitter' | 'contester';

export interface RoleHolder {
	kind: RoleKind;
	businessId: number;
	businessShortNumber: string;
	personNumber: number | null;
	committeeNumber: number | null;
	parlGroupNumber: number | null;
}

export async function fetchBusinessRoles(
	businessId: number,
	locale: Locale
): Promise<RoleHolder[]> {
	const rows = await queryOData<BusinessRoleRow>(
		'BusinessRole',
		locale,
		`BusinessNumber eq ${businessId} and (Role eq ${SUBMITTER_ROLE} or Role eq ${CONTESTER_ROLE})`
	);
	return rows.map((row) => ({
		kind: row.Role === CONTESTER_ROLE ? 'contester' : 'submitter',
		businessId: row.BusinessNumber,
		businessShortNumber: row.BusinessShortNumber,
		personNumber: row.MemberCouncilNumber,
		committeeNumber: row.CommitteeNumber,
		parlGroupNumber: row.ParlGroupNumber
	}));
}
