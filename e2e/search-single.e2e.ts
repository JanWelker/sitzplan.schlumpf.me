import { test, expect } from '@playwright/test';
import { mockODataRoutes } from './fixtures/mockOData';

test('searching a single affair highlights its rapporteurs and lists the committee-held submitter as text-only', async ({
	page
}) => {
	await mockODataRoutes(page);
	await page.goto('/de');

	await page.getByRole('textbox', { name: 'Curia-Vista-Geschäftsnummer(n)' }).fill('26.3533');
	await page.getByRole('button', { name: 'Suchen' }).click();

	const fischerSeat = page.getByRole('button', { name: /Benjamin Fischer — Berichterstattung/ });
	const gysinSeat = page.getByRole('button', { name: /Greta Gysin — Berichterstattung/ });
	await expect(fischerSeat).toBeVisible();
	await expect(gysinSeat).toBeVisible();

	await expect(page.getByRole('heading', { name: 'Nationalrat' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Ständerat' })).toHaveCount(0);

	await expect(page.getByText('Staatspolitische Kommission Nationalrat')).toBeVisible();
	await expect(page.getByText('Eingereicht von')).toBeVisible();
});
