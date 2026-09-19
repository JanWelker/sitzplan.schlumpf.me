import type { Locale } from './types';

export const ODATA_BASE_URL = 'https://ws.parlament.ch/odata.svc';

export class ODataError extends Error {
	status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = 'ODataError';
		this.status = status;
	}
}

/**
 * Queries a multilingual OData entity, always scoping to one language.
 * The API's response envelope is inconsistent between queries: a filtered
 * query returns `{ d: { results: [...] } }`, but some unfiltered/`$top`
 * queries return `{ d: [...] }` directly. Both shapes are handled here —
 * don't "simplify" this back to one shape without re-checking live.
 */
export async function queryOData<T>(entity: string, locale: Locale, filter?: string): Promise<T[]> {
	const clauses = [`Language eq '${locale.toUpperCase()}'`];
	if (filter) clauses.push(`(${filter})`);
	const url = `${ODATA_BASE_URL}/${entity}?$filter=${encodeURIComponent(clauses.join(' and '))}&$format=json`;

	let response: Response;
	try {
		response = await fetch(url);
	} catch {
		throw new ODataError(`Network error querying ${entity}`);
	}

	if (!response.ok) {
		throw new ODataError(
			`OData request for ${entity} failed with status ${response.status}`,
			response.status
		);
	}

	let json: unknown;
	try {
		json = await response.json();
	} catch {
		throw new ODataError(`OData response for ${entity} was not valid JSON`);
	}

	const d = (json as { d?: unknown })?.d;
	if (Array.isArray(d)) return d as T[];
	if (d && typeof d === 'object' && Array.isArray((d as { results?: unknown }).results)) {
		return (d as { results: T[] }).results;
	}
	throw new ODataError(`Unexpected OData response shape for ${entity}`);
}
