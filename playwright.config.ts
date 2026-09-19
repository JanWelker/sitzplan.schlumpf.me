import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
		url: 'http://127.0.0.1:4173/de',
		timeout: 120_000,
		reuseExistingServer: !process.env.CI
	},
	testMatch: '**/*.e2e.{ts,js}',
	use: { baseURL: 'http://127.0.0.1:4173' },
	reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']]
});
