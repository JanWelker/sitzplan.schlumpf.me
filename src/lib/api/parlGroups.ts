import { queryOData } from './odata';
import { withSessionCache } from './sessionCache';
import type { Locale, ParlGroupRow } from './types';
import { FALLBACK_PARTY_COLOR } from '../config/partyColors';

export interface ParlGroupColor {
	parlGroupNumber: number;
	abbreviation: string;
	name: string;
	/** Normalized "#rrggbb", or the shared fallback when the API hasn't assigned one yet. */
	color: string;
}

/** The API returns colors as "0x005E29" — normalize to CSS "#005e29". */
export function normalizeColor(wireColor: string | null): string {
	if (!wireColor) return FALLBACK_PARTY_COLOR;
	const hex = wireColor.replace(/^0x/i, '');
	return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : FALLBACK_PARTY_COLOR;
}

const SELECT = ['ParlGroupNumber', 'ParlGroupAbbreviation', 'ParlGroupName', 'ParlGroupColour'];

async function loadParlGroupColors(locale: Locale): Promise<ParlGroupColor[]> {
	const rows = await queryOData<ParlGroupRow>('ParlGroup', locale, {
		filter: 'IsActive eq true',
		select: SELECT
	});
	return rows.map((row) => ({
		parlGroupNumber: row.ParlGroupNumber,
		abbreviation: row.ParlGroupAbbreviation,
		name: row.ParlGroupName,
		color: normalizeColor(row.ParlGroupColour)
	}));
}

/** Returned as a plain array (not a Map) so it can round-trip through sessionStorage as JSON. */
function fetchParlGroupColorList(locale: Locale): Promise<ParlGroupColor[]> {
	return withSessionCache(`parlGroupColors:${locale}`, () => loadParlGroupColors(locale));
}

export async function fetchParlGroupColorIndex(
	locale: Locale
): Promise<Map<number, ParlGroupColor>> {
	const list = await fetchParlGroupColorList(locale);
	return new Map(list.map((entry) => [entry.parlGroupNumber, entry]));
}
