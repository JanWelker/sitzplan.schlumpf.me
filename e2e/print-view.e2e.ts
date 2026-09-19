import { test, expect } from '@playwright/test';
import { mockODataRoutes } from './fixtures/mockOData';

test('the print view shows a static, named roster and hides interactive chrome', async ({
	page
}) => {
	await mockODataRoutes(page);
	await page.goto('/de');

	await page.getByRole('textbox', { name: 'Curia-Vista-Geschäftsnummer(n)' }).fill('26.3533');
	await page.getByRole('button', { name: 'Suchen' }).click();
	await expect(
		page.getByRole('button', { name: /Benjamin Fischer — Berichterstattung/ })
	).toBeVisible();

	await page.emulateMedia({ media: 'print' });

	// Interactive-only chrome is hidden when printing.
	await expect(page.getByRole('textbox', { name: 'Curia-Vista-Geschäftsnummer(n)' })).toBeHidden();
	await expect(page.getByRole('navigation', { name: 'Sprache' })).toBeHidden();

	// The searched numbers and a static, named roster (hover tooltips don't
	// work on paper) become visible instead.
	await expect(page.getByText('Geschäftsnummer(n): 26.3533')).toBeVisible();
	const printedRoster = page.locator('.highlighted-list');
	await expect(printedRoster.getByText('Benjamin Fischer')).toBeVisible();
	await expect(printedRoster.getByText('Greta Gysin')).toBeVisible();
});

test('the print page size is set to A4 landscape', async ({ page }) => {
	await mockODataRoutes(page);
	await page.goto('/de');

	const pageCss = await page.evaluate(() => {
		function findPageRule(rules: CSSRuleList): string | null {
			for (const rule of Array.from(rules)) {
				if (rule instanceof CSSPageRule) return rule.cssText;
				if (rule instanceof CSSMediaRule) {
					const nested = findPageRule(rule.cssRules);
					if (nested) return nested;
				}
			}
			return null;
		}
		for (const sheet of Array.from(document.styleSheets)) {
			try {
				const found = findPageRule(sheet.cssRules);
				if (found) return found;
			} catch {
				// Cross-origin stylesheets (e.g. Google Fonts) throw on .cssRules — skip them.
			}
		}
		return null;
	});

	expect(pageCss?.toLowerCase()).toContain('a4');
	expect(pageCss?.toLowerCase()).toContain('landscape');
});
