import { test, expect } from '@playwright/test';
import { mockODataRoutes } from './fixtures/mockOData';

test('a role held by a committee never renders as a seat highlight, only as a text note', async ({
	page
}) => {
	await mockODataRoutes(page);
	await page.goto('/de');

	await page.getByRole('textbox', { name: 'Curia-Vista-Geschäftsnummer(n)' }).fill('26.3533');
	await page.getByRole('button', { name: 'Suchen' }).click();

	await expect(page.getByRole('heading', { name: 'Ohne Sitzplatz' })).toBeVisible();
	await expect(page.getByText('Staatspolitische Kommission Nationalrat')).toBeVisible();
	await expect(page.getByText('(Kommission)')).toBeVisible();

	// Only the two individual rapporteurs get a seat highlight — the
	// committee-held submitter role must not add a third one.
	const highlighted = page.getByRole('button', {
		name: /Berichterstattung|Eingereicht von|Bekämpft von/
	});
	await expect(highlighted).toHaveCount(2);
});
