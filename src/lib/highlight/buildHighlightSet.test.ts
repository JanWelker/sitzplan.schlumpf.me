import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildHighlightSet } from './buildHighlightSet';
import { clearSessionCacheForTests } from '../api/sessionCache';

vi.mock('../api/businesses', () => ({ fetchBusiness: vi.fn() }));
vi.mock('../api/roles', () => ({ fetchBusinessRoles: vi.fn() }));
vi.mock('../api/rapporteurs', () => ({ fetchRapporteurs: vi.fn() }));
vi.mock('../api/seatRoster', () => ({ fetchSeatRoster: vi.fn() }));
vi.mock('../api/members', () => ({ fetchMemberCouncil: vi.fn() }));
vi.mock('../api/committees', () => ({ fetchCommitteeName: vi.fn() }));
vi.mock('../api/parlGroups', () => ({ fetchParlGroupColorIndex: vi.fn() }));

import { fetchBusiness } from '../api/businesses';
import { fetchBusinessRoles } from '../api/roles';
import { fetchRapporteurs } from '../api/rapporteurs';
import { fetchSeatRoster } from '../api/seatRoster';
import { fetchMemberCouncil } from '../api/members';
import { fetchCommitteeName } from '../api/committees';
import { fetchParlGroupColorIndex } from '../api/parlGroups';

const business = vi.mocked(fetchBusiness);
const roles = vi.mocked(fetchBusinessRoles);
const rapporteurs = vi.mocked(fetchRapporteurs);
const roster = vi.mocked(fetchSeatRoster);
const memberFallback = vi.mocked(fetchMemberCouncil);
const committeeName = vi.mocked(fetchCommitteeName);
const parlGroupIndex = vi.mocked(fetchParlGroupColorIndex);

const NR_SEAT_FISCHER = {
	seatNumber: 42,
	personNumber: 4326,
	firstName: 'Benjamin',
	lastName: 'Fischer',
	cantonAbbreviation: 'ZH',
	parlGroupNumber: 4,
	parlGroupName: 'SVP'
};
const NR_SEAT_GYSIN = {
	seatNumber: 7,
	personNumber: 4268,
	firstName: 'Greta',
	lastName: 'Gysin',
	cantonAbbreviation: 'TI',
	parlGroupNumber: 6,
	parlGroupName: 'Grüne'
};

beforeEach(() => {
	clearSessionCacheForTests();
	vi.resetAllMocks();
	roster.mockImplementation(async (chamber) =>
		chamber === 'nr' ? [NR_SEAT_FISCHER, NR_SEAT_GYSIN] : []
	);
	roles.mockResolvedValue([]);
	rapporteurs.mockResolvedValue([]);
	parlGroupIndex.mockResolvedValue(new Map());
});

describe('buildHighlightSet', () => {
	it('places an individual rapporteur and submitter both on the roster onto their seats', async () => {
		business.mockResolvedValue({
			id: 20263533,
			shortNumber: '26.3533',
			title: 'Test',
			businessTypeName: 'Motion'
		});
		roles.mockResolvedValue([
			{
				kind: 'submitter',
				businessId: 20263533,
				businessShortNumber: '26.3533',
				personNumber: 4326,
				committeeNumber: null,
				parlGroupNumber: null
			}
		]);
		rapporteurs.mockResolvedValue([
			{
				businessId: 20263533,
				businessShortNumber: '26.3533',
				personNumber: 4268,
				firstName: 'Greta',
				lastName: 'Gysin'
			}
		]);

		const result = await buildHighlightSet('26.3533', 'de');

		expect(result.nr).toHaveLength(2);
		const fischerSeat = result.nr.find((s) => s.personNumber === 4326);
		expect(fischerSeat?.roles).toEqual([{ kind: 'submitter', businessShortNumber: '26.3533' }]);
		const gysinSeat = result.nr.find((s) => s.personNumber === 4268);
		expect(gysinSeat?.roles).toEqual([{ kind: 'rapporteur', businessShortNumber: '26.3533' }]);
		expect(result.unseated).toEqual([]);
		expect(result.businessErrors).toEqual([]);
	});

	it('renders a committee-held submitter as a text-only unseated entry, not a seat highlight', async () => {
		business.mockResolvedValue({
			id: 20263533,
			shortNumber: '26.3533',
			title: 'Test',
			businessTypeName: 'Motion'
		});
		roles.mockResolvedValue([
			{
				kind: 'submitter',
				businessId: 20263533,
				businessShortNumber: '26.3533',
				personNumber: null,
				committeeNumber: 11,
				parlGroupNumber: null
			}
		]);
		committeeName.mockResolvedValue('Staatspolitische Kommission Nationalrat');

		const result = await buildHighlightSet('26.3533', 'de');

		expect(result.nr).toEqual([]);
		expect(result.sr).toEqual([]);
		expect(result.unseated).toEqual([
			{
				key: 'committee:11',
				displayName: 'Staatspolitische Kommission Nationalrat',
				reason: 'committee',
				roles: [{ kind: 'submitter', businessShortNumber: '26.3533' }]
			}
		]);
	});

	it('renders a parlGroup-held role as a text-only unseated entry using the resolved group name', async () => {
		business.mockResolvedValue({
			id: 1,
			shortNumber: '26.0001',
			title: 'Test',
			businessTypeName: 'Motion'
		});
		roles.mockResolvedValue([
			{
				kind: 'contester',
				businessId: 1,
				businessShortNumber: '26.0001',
				personNumber: null,
				committeeNumber: null,
				parlGroupNumber: 4
			}
		]);
		parlGroupIndex.mockResolvedValue(
			new Map([
				[4, { parlGroupNumber: 4, abbreviation: 'V', name: 'SVP-Fraktion', color: '#005e29' }]
			])
		);

		const result = await buildHighlightSet('26.0001', 'de');

		expect(result.unseated).toEqual([
			{
				key: 'parlgroup:4',
				displayName: 'SVP-Fraktion',
				reason: 'parlGroup',
				roles: [{ kind: 'contester', businessShortNumber: '26.0001' }]
			}
		]);
	});

	it('merges roles from multiple affairs onto the same seat', async () => {
		business.mockImplementation(async (shortNumber) => ({
			id: shortNumber === '26.3533' ? 1 : 2,
			shortNumber,
			title: 'Test',
			businessTypeName: 'Motion'
		}));
		roles.mockImplementation(async (businessId) =>
			businessId === 1
				? [
						{
							kind: 'submitter',
							businessId: 1,
							businessShortNumber: '26.3533',
							personNumber: 4326,
							committeeNumber: null,
							parlGroupNumber: null
						}
					]
				: [
						{
							kind: 'contester',
							businessId: 2,
							businessShortNumber: '26.4063',
							personNumber: 4326,
							committeeNumber: null,
							parlGroupNumber: null
						}
					]
		);

		const result = await buildHighlightSet('26.3533, 26.4063', 'de');

		expect(result.nr).toHaveLength(1);
		expect(result.nr[0].personNumber).toBe(4326);
		expect(result.nr[0].roles).toEqual([
			{ kind: 'submitter', businessShortNumber: '26.3533' },
			{ kind: 'contester', businessShortNumber: '26.4063' }
		]);
	});

	it('does not duplicate a badge for the same (kind, business) pair', async () => {
		business.mockResolvedValue({
			id: 1,
			shortNumber: '26.3533',
			title: 'Test',
			businessTypeName: 'Motion'
		});
		roles.mockResolvedValue([
			{
				kind: 'submitter',
				businessId: 1,
				businessShortNumber: '26.3533',
				personNumber: 4326,
				committeeNumber: null,
				parlGroupNumber: null
			}
		]);
		rapporteurs.mockResolvedValue([
			{
				businessId: 1,
				businessShortNumber: '26.3533',
				personNumber: 4326,
				firstName: 'Benjamin',
				lastName: 'Fischer'
			}
		]);

		const result = await buildHighlightSet('26.3533', 'de');
		expect(result.nr[0].roles).toEqual([
			{ kind: 'submitter', businessShortNumber: '26.3533' },
			{ kind: 'rapporteur', businessShortNumber: '26.3533' }
		]);
	});

	it('records an unknown business number as a business error without failing the rest of the batch', async () => {
		business.mockImplementation(async (shortNumber) =>
			shortNumber === '99.9999'
				? null
				: { id: 1, shortNumber, title: 'Test', businessTypeName: 'Motion' }
		);
		roles.mockImplementation(async (businessId) =>
			businessId === 1
				? [
						{
							kind: 'submitter',
							businessId: 1,
							businessShortNumber: '26.3533',
							personNumber: 4326,
							committeeNumber: null,
							parlGroupNumber: null
						}
					]
				: []
		);

		const result = await buildHighlightSet('26.3533, 99.9999', 'de');

		expect(result.businessErrors).toEqual([{ shortNumber: '99.9999' }]);
		expect(result.nr).toHaveLength(1);
	});

	it('surfaces invalid tokens as parse errors without calling the API', async () => {
		const result = await buildHighlightSet('not-a-number', 'de');
		expect(result.parseErrors).toEqual(['not-a-number']);
		expect(business).not.toHaveBeenCalled();
		expect(roster).not.toHaveBeenCalled();
	});

	it('falls back to a MemberCouncil lookup for a non-rapporteur role holder not on the roster', async () => {
		business.mockResolvedValue({
			id: 1,
			shortNumber: '03.3169',
			title: 'Test',
			businessTypeName: 'Motion'
		});
		roles.mockResolvedValue([
			{
				kind: 'contester',
				businessId: 1,
				businessShortNumber: '03.3169',
				personNumber: 501,
				committeeNumber: null,
				parlGroupNumber: null
			}
		]);
		memberFallback.mockResolvedValue({
			personNumber: 501,
			firstName: 'Former',
			lastName: 'Member',
			council: 1,
			councilAbbreviation: 'NR',
			cantonAbbreviation: 'BE',
			parlGroupNumber: null,
			parlGroupAbbreviation: null,
			parlGroupName: null
		});

		const result = await buildHighlightSet('03.3169', 'de');

		expect(result.unseated).toEqual([
			{
				key: 'person:501',
				displayName: 'Former Member',
				reason: 'not-currently-seated',
				roles: [{ kind: 'contester', businessShortNumber: '03.3169' }]
			}
		]);
	});

	it('marks the roster as unavailable when the seat roster fetch fails, without throwing', async () => {
		roster.mockRejectedValue(new Error('network down'));

		const result = await buildHighlightSet('26.3533', 'de');

		expect(result.rosterUnavailable).toBe(true);
		expect(result.nr).toEqual([]);
		expect(result.sr).toEqual([]);
	});

	it('returns an empty result without any fetches for blank input', async () => {
		const result = await buildHighlightSet('   ', 'de');
		expect(result).toEqual({
			nr: [],
			sr: [],
			unseated: [],
			businessErrors: [],
			parseErrors: [],
			rosterUnavailable: false
		});
		expect(roster).not.toHaveBeenCalled();
	});
});
