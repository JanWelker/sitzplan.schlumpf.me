import { test, expect } from '@playwright/test';
import { mockODataRoutes } from './fixtures/mockOData';

test('searching multiple comma-separated affairs merges highlights from all of them', async ({
	page
}) => {
	await mockODataRoutes(page);
	await page.goto('/de');

	await page
		.getByRole('textbox', { name: 'Curia-Vista-Geschäftsnummer(n)' })
		.fill('26.3533, 25.3235');
	await page.getByRole('button', { name: 'Suchen' }).click();

	// Rapporteurs from 26.3533
	await expect(
		page.getByRole('button', { name: /Benjamin Fischer — Berichterstattung/ })
	).toBeVisible();
	await expect(page.getByRole('button', { name: /Greta Gysin — Berichterstattung/ })).toBeVisible();

	// Contester and submitter from 25.3235
	await expect(page.getByRole('button', { name: /Mauro Tuena — Bekämpft von/ })).toBeVisible();
	await expect(
		page.getByRole('button', { name: /Gerhard Andrey — Eingereicht von/ })
	).toBeVisible();

	// Both affairs' relevant people are Nationalrat members — one chart, four highlighted seats.
	await expect(page.getByRole('heading', { name: 'Nationalrat' })).toBeVisible();
	const highlighted = page.getByRole('button', {
		name: /Berichterstattung|Eingereicht von|Bekämpft von/
	});
	await expect(highlighted).toHaveCount(4);
});
