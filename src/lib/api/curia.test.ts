import { describe, expect, it } from 'vitest';
import { parseCuriaInput } from './curia';

describe('parseCuriaInput', () => {
	it('parses a single number', () => {
		expect(parseCuriaInput('26.3533')).toEqual({ valid: ['26.3533'], invalid: [] });
	});

	it('parses a comma-separated list, trimming whitespace', () => {
		const result = parseCuriaInput('26.3533, 26.006 ,  24.3992');
		expect(result).toEqual({ valid: ['26.3533', '26.006', '24.3992'], invalid: [] });
	});

	it('accepts both 3-digit and 4-5 digit suffixes', () => {
		const result = parseCuriaInput('26.006, 26.3533');
		expect(result.valid).toEqual(['26.006', '26.3533']);
		expect(result.invalid).toEqual([]);
	});

	it('parses the full real-world 10-number test string', () => {
		const raw =
			'25.3235, 25.3923, 25.4091, 25.4092, 25.4093, 25.4094, 25.4095, 25.4096, 24.3855, 24.3857';
		const result = parseCuriaInput(raw);
		expect(result.valid).toHaveLength(10);
		expect(result.invalid).toEqual([]);
	});

	it('collects invalid tokens without dropping valid ones', () => {
		const result = parseCuriaInput('26.3533, not-a-number, 26.006');
		expect(result.valid).toEqual(['26.3533', '26.006']);
		expect(result.invalid).toEqual(['not-a-number']);
	});

	it('dedupes repeated valid numbers', () => {
		const result = parseCuriaInput('26.3533, 26.3533, 26.006');
		expect(result.valid).toEqual(['26.3533', '26.006']);
	});

	it('ignores empty tokens from trailing/double commas', () => {
		const result = parseCuriaInput('26.3533,, , 26.006,');
		expect(result.valid).toEqual(['26.3533', '26.006']);
		expect(result.invalid).toEqual([]);
	});

	it('returns empty result for blank input', () => {
		expect(parseCuriaInput('')).toEqual({ valid: [], invalid: [] });
		expect(parseCuriaInput('   ')).toEqual({ valid: [], invalid: [] });
	});
});
