import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchParlGroupColorIndex, normalizeColor } from './parlGroups';
import { FALLBACK_PARTY_COLOR } from '../config/partyColors';

describe('normalizeColor', () => {
	it('converts the API wire format to a lowercase CSS hex color', () => {
		expect(normalizeColor('0x005E29')).toBe('#005e29');
	});

	it('falls back for null (confirmed to happen for at least one active group)', () => {
		expect(normalizeColor(null)).toBe(FALLBACK_PARTY_COLOR);
	});

	it('falls back for an unrecognized format', () => {
		expect(normalizeColor('not-a-color')).toBe(FALLBACK_PARTY_COLOR);
	});
});

describe('fetchParlGroupColorIndex', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('indexes groups by ParlGroupNumber and applies the fallback for a missing colour', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					d: {
						results: [
							{
								ParlGroupNumber: 4,
								ParlGroupAbbreviation: 'V',
								ParlGroupName: 'SVP',
								ParlGroupColour: '0x005E29'
							},
							{
								ParlGroupNumber: 137,
								ParlGroupAbbreviation: 'GL',
								ParlGroupName: 'GLP',
								ParlGroupColour: null
							}
						]
					}
				})
			})
		);

		const index = await fetchParlGroupColorIndex('de');
		expect(index.get(4)?.color).toBe('#005e29');
		expect(index.get(137)?.color).toBe(FALLBACK_PARTY_COLOR);
		expect(index.get(999)).toBeUndefined();
	});
});
