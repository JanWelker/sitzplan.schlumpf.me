import { test, expect } from '@playwright/test';
import { mockODataRoutes } from './fixtures/mockOData';

test('an unknown affair number degrades gracefully without blocking the rest of the batch', async ({
	page
}) => {
	await mockODataRoutes(page);
	await page.goto('/de');

	await page
		.getByRole('textbox', { name: 'Curia-Vista-Geschäftsnummer(n)' })
		.fill('26.3533, 99.9999');
	await page.getByRole('button', { name: 'Suchen' }).click();

	await expect(page.getByText('Geschäft 99.9999 wurde nicht gefunden.')).toBeVisible();
	// The rest of the batch still resolves normally.
	await expect(
		page.getByRole('button', { name: /Benjamin Fischer — Berichterstattung/ })
	).toBeVisible();
});

test('a syntactically invalid token is reported without calling the API', async ({ page }) => {
	await mockODataRoutes(page);
	await page.goto('/de');

	await page.getByRole('textbox', { name: 'Curia-Vista-Geschäftsnummer(n)' }).fill('not-a-number');
	await page.getByRole('button', { name: 'Suchen' }).click();

	await expect(page.getByText('Ungültige Geschäftsnummer: not-a-number')).toBeVisible();
});
