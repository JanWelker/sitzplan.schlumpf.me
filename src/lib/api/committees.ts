import { queryOData } from './odata';
import type { CommitteeRow, Locale } from './types';

export async function fetchCommitteeName(
	committeeNumber: number,
	locale: Locale
): Promise<string | null> {
	const rows = await queryOData<CommitteeRow>(
		'Committee',
		locale,
		`CommitteeNumber eq ${committeeNumber}`
	);
	return rows[0]?.CommitteeName ?? null;
}
