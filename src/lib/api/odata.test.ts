import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOData, ODataError } from './odata';

function mockFetchOnce(body: unknown, ok = true, status = 200) {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok,
			status,
			json: async () => body
		})
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('queryOData', () => {
	it('unwraps the {d:{results:[...]}} envelope', async () => {
		mockFetchOnce({ d: { results: [{ foo: 'bar' }] } });
		const rows = await queryOData('Business', 'de');
		expect(rows).toEqual([{ foo: 'bar' }]);
	});

	it('unwraps the {d:[...]} bare-array envelope', async () => {
		mockFetchOnce({ d: [{ foo: 'baz' }] });
		const rows = await queryOData('SeatOrganisationNr', 'de');
		expect(rows).toEqual([{ foo: 'baz' }]);
	});

	it('always appends a Language filter clause', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, status: 200, json: async () => ({ d: [] }) });
		vi.stubGlobal('fetch', fetchMock);

		await queryOData('MemberCouncil', 'fr', { filter: 'PersonNumber eq 123' });

		const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
		expect(calledUrl).toContain("Language eq 'FR'");
		expect(calledUrl).toContain('PersonNumber eq 123');
	});

	it('appends a $select clause when fields are given, to cut payload size', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, status: 200, json: async () => ({ d: [] }) });
		vi.stubGlobal('fetch', fetchMock);

		await queryOData('Business', 'de', { select: ['ID', 'Title'] });

		const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
		expect(calledUrl).toContain('$select=ID,Title');
	});

	it('omits $select entirely when no fields are given', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, status: 200, json: async () => ({ d: [] }) });
		vi.stubGlobal('fetch', fetchMock);

		await queryOData('Business', 'de');

		const calledUrl = fetchMock.mock.calls[0][0] as string;
		expect(calledUrl).not.toContain('$select');
	});

	it('throws ODataError on a non-2xx response', async () => {
		mockFetchOnce({}, false, 500);
		await expect(queryOData('Business', 'de')).rejects.toBeInstanceOf(ODataError);
	});

	it('throws ODataError on a network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
		await expect(queryOData('Business', 'de')).rejects.toBeInstanceOf(ODataError);
	});

	it('throws ODataError on an unrecognized response shape', async () => {
		mockFetchOnce({ d: { notResults: [] } });
		await expect(queryOData('Business', 'de')).rejects.toBeInstanceOf(ODataError);
	});
});
