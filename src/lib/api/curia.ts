const CURIA_NUMBER_PATTERN = /^\d{2}\.\d{3,5}$/;

export interface ParsedCuriaInput {
	valid: string[];
	invalid: string[];
}

/**
 * Splits a user-typed, comma-separated list of Curia Vista affair numbers
 * (e.g. "26.3533, 26.006") into valid and invalid tokens. Valid tokens are
 * passed through verbatim — they're used as-is as `BusinessShortNumber`
 * filter values, never reformatted or padded.
 */
export function parseCuriaInput(raw: string): ParsedCuriaInput {
	const tokens = raw
		.split(',')
		.map((token) => token.trim())
		.filter((token) => token.length > 0);

	const valid: string[] = [];
	const seen = new Set<string>();
	const invalid: string[] = [];

	for (const token of tokens) {
		if (!CURIA_NUMBER_PATTERN.test(token)) {
			invalid.push(token);
			continue;
		}
		if (seen.has(token)) continue;
		seen.add(token);
		valid.push(token);
	}

	return { valid, invalid };
}
