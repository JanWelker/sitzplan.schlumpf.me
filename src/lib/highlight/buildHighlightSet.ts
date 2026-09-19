import { parseCuriaInput } from '../api/curia';
import { fetchBusinesses } from '../api/businesses';
import { fetchBusinessRolesForBusinesses } from '../api/roles';
import { fetchRapporteursForBusinesses } from '../api/rapporteurs';
import { fetchSeatRoster, type SeatEntry } from '../api/seatRoster';
import { fetchMemberCouncils } from '../api/members';
import { fetchCommitteeNames } from '../api/committees';
import { fetchParlGroupColorIndex } from '../api/parlGroups';
import type { Chamber, Locale } from '../api/types';

export type RoleKind = 'rapporteur' | 'submitter' | 'contester';

export interface RoleBadge {
	kind: RoleKind;
	businessShortNumber: string;
}

export interface SeatHighlight {
	chamber: Chamber;
	seatNumber: number;
	personNumber: number;
	firstName: string;
	lastName: string;
	cantonAbbreviation: string | null;
	parlGroupNumber: number | null;
	roles: RoleBadge[];
}

export type UnseatedReason = 'not-currently-seated' | 'committee' | 'parlGroup';

export interface UnseatedEntry {
	key: string;
	displayName: string;
	reason: UnseatedReason;
	roles: RoleBadge[];
}

export interface AffairError {
	shortNumber: string;
}

export interface HighlightSet {
	nr: SeatHighlight[];
	sr: SeatHighlight[];
	unseated: UnseatedEntry[];
	businessErrors: AffairError[];
	parseErrors: string[];
	rosterUnavailable: boolean;
}

interface Assignment {
	kind: RoleKind;
	businessShortNumber: string;
	personNumber: number | null;
	committeeNumber: number | null;
	parlGroupNumber: number | null;
	knownFirstName?: string;
	knownLastName?: string;
}

function emptySet(parseErrors: string[]): HighlightSet {
	return {
		nr: [],
		sr: [],
		unseated: [],
		businessErrors: [],
		parseErrors,
		rosterUnavailable: false
	};
}

function addRoleBadge(roles: RoleBadge[], badge: RoleBadge): void {
	const exists = roles.some(
		(r) => r.kind === badge.kind && r.businessShortNumber === badge.businessShortNumber
	);
	if (!exists) roles.push(badge);
}

export async function buildHighlightSet(rawInput: string, locale: Locale): Promise<HighlightSet> {
	const { valid, invalid } = parseCuriaInput(rawInput);
	if (valid.length === 0) return emptySet(invalid);

	let nrRoster: SeatEntry[];
	let srRoster: SeatEntry[];
	try {
		[nrRoster, srRoster] = await Promise.all([
			fetchSeatRoster('nr', locale),
			fetchSeatRoster('sr', locale)
		]);
	} catch {
		return { ...emptySet(invalid), rosterUnavailable: true };
	}

	const nrByPerson = new Map(nrRoster.map((seat) => [seat.personNumber, seat]));
	const srByPerson = new Map(srRoster.map((seat) => [seat.personNumber, seat]));

	// One batched request resolves every entered affair number at once,
	// instead of one request per number — the API supports OR-combined
	// filters (confirmed live), so this stays a single round trip
	// regardless of how many affairs were entered.
	const businesses = await fetchBusinesses(valid, locale);
	const businessByShortNumber = new Map(businesses.map((b) => [b.shortNumber, b]));
	const businessErrors: AffairError[] = valid
		.filter((shortNumber) => !businessByShortNumber.has(shortNumber))
		.map((shortNumber) => ({ shortNumber }));

	const businessIds = businesses.map((b) => b.id);
	const [roles, rapporteurs] = await Promise.all([
		fetchBusinessRolesForBusinesses(businessIds, locale),
		fetchRapporteursForBusinesses(businessIds, locale)
	]);

	const assignments: Assignment[] = [
		...roles.map((role) => ({
			kind: role.kind as RoleKind,
			businessShortNumber: role.businessShortNumber,
			personNumber: role.personNumber,
			committeeNumber: role.committeeNumber,
			parlGroupNumber: role.parlGroupNumber
		})),
		...rapporteurs.map((rapporteur) => ({
			kind: 'rapporteur' as const,
			businessShortNumber: rapporteur.businessShortNumber,
			personNumber: rapporteur.personNumber,
			committeeNumber: null,
			parlGroupNumber: null,
			knownFirstName: rapporteur.firstName,
			knownLastName: rapporteur.lastName
		}))
	];

	// Gather fallback lookups needed for people not on the roster, and for
	// committee/parlGroup-held roles, deduplicated so each is fetched once
	// (and each as a single batched request, not one per item).
	const personFallbackNumbers = new Set<number>();
	const committeeNumbers = new Set<number>();
	let needsParlGroupNames = false;

	for (const a of assignments) {
		if (a.personNumber !== null) {
			if (!nrByPerson.has(a.personNumber) && !srByPerson.has(a.personNumber) && !a.knownFirstName) {
				personFallbackNumbers.add(a.personNumber);
			}
		} else if (a.committeeNumber !== null) {
			committeeNumbers.add(a.committeeNumber);
		} else if (a.parlGroupNumber !== null) {
			needsParlGroupNames = true;
		}
	}

	const [memberFallbacks, committeeNameByNumber, parlGroupIndex] = await Promise.all([
		fetchMemberCouncils([...personFallbackNumbers], locale),
		fetchCommitteeNames([...committeeNumbers], locale),
		needsParlGroupNames ? fetchParlGroupColorIndex(locale) : Promise.resolve(new Map())
	]);
	const memberFallbackByPerson = new Map(memberFallbacks.map((m) => [m.personNumber, m]));

	const seatHighlights = new Map<string, SeatHighlight>();
	const unseated = new Map<string, UnseatedEntry>();

	for (const a of assignments) {
		const badge: RoleBadge = { kind: a.kind, businessShortNumber: a.businessShortNumber };

		if (a.personNumber !== null) {
			const nrSeat = nrByPerson.get(a.personNumber);
			const srSeat = srByPerson.get(a.personNumber);
			const seat = nrSeat ?? srSeat;
			const chamber: Chamber | null = nrSeat ? 'nr' : srSeat ? 'sr' : null;

			if (seat && chamber) {
				const key = `${chamber}:${seat.seatNumber}`;
				const existing = seatHighlights.get(key);
				if (existing) {
					addRoleBadge(existing.roles, badge);
				} else {
					seatHighlights.set(key, {
						chamber,
						seatNumber: seat.seatNumber,
						personNumber: a.personNumber,
						firstName: seat.firstName,
						lastName: seat.lastName,
						cantonAbbreviation: seat.cantonAbbreviation,
						parlGroupNumber: seat.parlGroupNumber,
						roles: [badge]
					});
				}
				continue;
			}

			const key = `person:${a.personNumber}`;
			const fallback = memberFallbackByPerson.get(a.personNumber);
			const displayName =
				a.knownFirstName && a.knownLastName
					? `${a.knownFirstName} ${a.knownLastName}`
					: fallback
						? `${fallback.firstName} ${fallback.lastName}`
						: `Person ${a.personNumber}`;
			const existing = unseated.get(key);
			if (existing) {
				addRoleBadge(existing.roles, badge);
			} else {
				unseated.set(key, { key, displayName, reason: 'not-currently-seated', roles: [badge] });
			}
			continue;
		}

		if (a.committeeNumber !== null) {
			const key = `committee:${a.committeeNumber}`;
			const displayName =
				committeeNameByNumber.get(a.committeeNumber) ?? `Kommission ${a.committeeNumber}`;
			const existing = unseated.get(key);
			if (existing) {
				addRoleBadge(existing.roles, badge);
			} else {
				unseated.set(key, { key, displayName, reason: 'committee', roles: [badge] });
			}
			continue;
		}

		if (a.parlGroupNumber !== null) {
			const key = `parlgroup:${a.parlGroupNumber}`;
			const displayName =
				parlGroupIndex.get(a.parlGroupNumber)?.name ?? `Fraktion ${a.parlGroupNumber}`;
			const existing = unseated.get(key);
			if (existing) {
				addRoleBadge(existing.roles, badge);
			} else {
				unseated.set(key, { key, displayName, reason: 'parlGroup', roles: [badge] });
			}
		}
	}

	const nr = [...seatHighlights.values()]
		.filter((s) => s.chamber === 'nr')
		.sort((a, b) => a.seatNumber - b.seatNumber);
	const sr = [...seatHighlights.values()]
		.filter((s) => s.chamber === 'sr')
		.sort((a, b) => a.seatNumber - b.seatNumber);

	return {
		nr,
		sr,
		unseated: [...unseated.values()],
		businessErrors,
		parseErrors: invalid,
		rosterUnavailable: false
	};
}
