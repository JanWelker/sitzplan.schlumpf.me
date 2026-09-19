import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'odata');

function load<T>(name: string): T {
	return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), 'utf-8')) as T;
}

type BusinessRow = { ID: number };

const business = load<Record<string, BusinessRow | null>>('business.de.json');
const businessRole = load<Record<string, unknown[]>>('businessRole.de.json');
const rapporteur = load<Record<string, unknown[]>>('rapporteur.de.json');
const seatOrganisationNr = load<unknown[]>('seatOrganisationNr.de.json');
const seatOrganisationSr = load<unknown[]>('seatOrganisationSr.de.json');
const parlGroup = load<unknown[]>('parlGroup.de.json');
const committee = load<unknown[]>('committee.de.json');

function shortNumberForBusinessId(id: number): string | undefined {
	return Object.keys(business).find((key) => business[key]?.ID === id);
}

function envelope(results: unknown[]) {
	return { d: { results } };
}

/**
 * Intercepts every call to the live ws.parlament.ch OData API with fixture
 * data recorded (via scripts/record-fixtures.ts) from the real API for the
 * Curia numbers exercised by this suite — so e2e runs are deterministic and
 * never depend on the live government API being up in CI.
 */
export async function mockODataRoutes(page: Page): Promise<void> {
	await page.route('https://ws.parlament.ch/odata.svc/**', async (route) => {
		const url = new URL(route.request().url());
		const entity = url.pathname.split('/').filter(Boolean).pop() ?? '';
		const filter = decodeURIComponent(url.searchParams.get('$filter') ?? '');

		if (entity === 'Business') {
			const shortNumber = filter.match(/BusinessShortNumber eq '([^']+)'/)?.[1];
			const row = shortNumber ? business[shortNumber] : null;
			return route.fulfill({ json: envelope(row ? [row] : []) });
		}

		if (entity === 'BusinessRole') {
			const id = filter.match(/BusinessNumber eq (\d+)/)?.[1];
			const shortNumber = id ? shortNumberForBusinessId(Number(id)) : undefined;
			return route.fulfill({
				json: envelope(shortNumber ? (businessRole[shortNumber] ?? []) : [])
			});
		}

		if (entity === 'Rapporteur') {
			const id = filter.match(/BusinessNumber eq (\d+)/)?.[1];
			const shortNumber = id ? shortNumberForBusinessId(Number(id)) : undefined;
			return route.fulfill({ json: envelope(shortNumber ? (rapporteur[shortNumber] ?? []) : []) });
		}

		if (entity === 'SeatOrganisationNr') {
			return route.fulfill({ json: envelope(seatOrganisationNr) });
		}

		if (entity === 'SeatOrganisationSr') {
			return route.fulfill({ json: envelope(seatOrganisationSr) });
		}

		if (entity === 'ParlGroup') {
			return route.fulfill({ json: envelope(parlGroup) });
		}

		if (entity === 'Committee') {
			return route.fulfill({ json: envelope(committee) });
		}

		// MemberCouncil and anything else unused by these fixtures.
		return route.fulfill({ json: envelope([]) });
	});
}
