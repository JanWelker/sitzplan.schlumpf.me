import { test, expect } from '@playwright/test';
import { mockODataRoutes } from './fixtures/mockOData';

test('switching language updates the UI text and preserves the current search', async ({
	page
}) => {
	await mockODataRoutes(page);
	await page.goto('/de?a=26.3533');

	await expect(page.getByRole('link', { name: 'Sitzplan' })).toBeVisible();
	await expect(page.getByRole('textbox')).toHaveValue('26.3533');

	await page.getByRole('link', { name: 'FR' }).click();

	await expect(page).toHaveURL(/\/fr\?a=26\.3533/);
	await expect(page.getByRole('link', { name: 'Plan des sièges' })).toBeVisible();
	await expect(page.getByRole('textbox')).toHaveValue('26.3533');
	await expect(page.getByRole('button', { name: 'Rechercher' })).toBeVisible();
});
