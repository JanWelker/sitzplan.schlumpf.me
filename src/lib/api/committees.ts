import { queryOData } from './odata';
import type { CommitteeRow, Locale } from './types';

const SELECT = ['CommitteeNumber', 'CommitteeName'];

/** Fetches names for every given committee number in one request. */
export async function fetchCommitteeNames(
	committeeNumbers: number[],
	locale: Locale
): Promise<Map<number, string>> {
	if (committeeNumbers.length === 0) return new Map();
	const filter = committeeNumbers.map((n) => `CommitteeNumber eq ${n}`).join(' or ');
	const rows = await queryOData<CommitteeRow>('Committee', locale, { filter, select: SELECT });
	return new Map(rows.map((row) => [row.CommitteeNumber, row.CommitteeName]));
}
