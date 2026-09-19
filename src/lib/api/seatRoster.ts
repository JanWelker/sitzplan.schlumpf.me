import { queryOData } from './odata';
import { withSessionCache } from './sessionCache';
import type { Chamber, Locale, SeatOrganisationRow } from './types';

export interface SeatEntry {
	seatNumber: number;
	personNumber: number;
	firstName: string;
	lastName: string;
	cantonAbbreviation: string | null;
	parlGroupNumber: number | null;
	parlGroupName: string | null;
}

const ENTITY_BY_CHAMBER: Record<Chamber, string> = {
	nr: 'SeatOrganisationNr',
	sr: 'SeatOrganisationSr'
};

const SELECT = [
	'SeatNumber',
	'PersonNumber',
	'FirstName',
	'LastName',
	'CantonAbbreviation',
	'ParlGroupNumber',
	'ParlGroupName'
];

async function loadSeatRoster(chamber: Chamber, locale: Locale): Promise<SeatEntry[]> {
	const rows = await queryOData<SeatOrganisationRow>(ENTITY_BY_CHAMBER[chamber], locale, {
		select: SELECT
	});
	return rows.map((row) => ({
		seatNumber: row.SeatNumber,
		personNumber: row.PersonNumber,
		firstName: row.FirstName,
		lastName: row.LastName,
		cantonAbbreviation: row.CantonAbbreviation,
		parlGroupNumber: row.ParlGroupNumber,
		parlGroupName: row.ParlGroupName
	}));
}

export function fetchSeatRoster(chamber: Chamber, locale: Locale): Promise<SeatEntry[]> {
	return withSessionCache(`seatRoster:${chamber}:${locale}`, () => loadSeatRoster(chamber, locale));
}
