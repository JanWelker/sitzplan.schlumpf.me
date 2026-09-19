/**
 * Dev-only script — NOT run in CI. Captures real responses from the live
 * ws.parlament.ch OData API for a curated set of Curia Vista numbers and
 * writes them as JSON fixtures under e2e/fixtures/odata/, so the Playwright
 * suite can mock the network deterministically without depending on the
 * live government API being up during CI runs.
 *
 * Run with: npx tsx scripts/record-fixtures.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://ws.parlament.ch/odata.svc';
const OUT_DIR = path.resolve(import.meta.dirname, '../e2e/fixtures/odata');

// The numbers actually exercised by the e2e suite.
const SHORT_NUMBERS = ['26.3533', '25.3235'];

async function query(entity: string, filter: string): Promise<unknown[]> {
	const url = `${BASE_URL}/${entity}?$filter=${encodeURIComponent(filter)}&$format=json`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${entity} query failed: ${res.status}`);
	const json = (await res.json()) as { d: { results?: unknown[] } | unknown[] };
	return Array.isArray(json.d) ? json.d : (json.d.results ?? []);
}

async function writeJson(name: string, data: unknown): Promise<void> {
	await mkdir(OUT_DIR, { recursive: true });
	await writeFile(path.join(OUT_DIR, name), JSON.stringify(data, null, '\t') + '\n');
	console.log(`wrote ${name}`);
}

async function main() {
	const businesses: Record<string, unknown> = {};
	const businessIds: Record<string, number> = {};

	for (const shortNumber of SHORT_NUMBERS) {
		const rows = await query(
			'Business',
			`BusinessShortNumber eq '${shortNumber}' and Language eq 'DE'`
		);
		const row = rows[0] as { ID: number } | undefined;
		businesses[shortNumber] = row ?? null;
		if (row) businessIds[shortNumber] = row.ID;
	}
	await writeJson('business.de.json', businesses);

	const roles: Record<string, unknown[]> = {};
	const rapporteurs: Record<string, unknown[]> = {};
	for (const [shortNumber, id] of Object.entries(businessIds)) {
		roles[shortNumber] = await query(
			'BusinessRole',
			`BusinessNumber eq ${id} and (Role eq 1 or Role eq 7) and Language eq 'DE'`
		);
		rapporteurs[shortNumber] = await query(
			'Rapporteur',
			`BusinessNumber eq ${id} and Language eq 'DE'`
		);
	}
	await writeJson('businessRole.de.json', roles);
	await writeJson('rapporteur.de.json', rapporteurs);

	const seatOrganisationNr = await query('SeatOrganisationNr', "Language eq 'DE'");
	await writeJson('seatOrganisationNr.de.json', seatOrganisationNr);

	const seatOrganisationSr = await query('SeatOrganisationSr', "Language eq 'DE'");
	await writeJson('seatOrganisationSr.de.json', seatOrganisationSr);

	const parlGroups = await query('ParlGroup', "IsActive eq true and Language eq 'DE'");
	await writeJson('parlGroup.de.json', parlGroups);

	const committee = await query('Committee', "CommitteeNumber eq 11 and Language eq 'DE'");
	await writeJson('committee.de.json', committee);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
