#!/usr/bin/env node
/**
 * Verifies that a DEPLOYED page's HTML and every script/stylesheet it
 * references actually resolve over HTTP.
 *
 * This exists because of a real incident: GitHub Pages serving from a
 * branch runs Jekyll by default, which silently excludes any directory
 * starting with an underscore — including SvelteKit's `_app/` build
 * output. The page's own HTML loaded fine (200), but every asset it
 * referenced 404'd, so the app never hydrated. No local build, preview
 * server, or Playwright-against-`vite preview` test could ever catch this,
 * because Jekyll processing only happens on the real GitHub Pages hosting
 * layer. This script re-fetches the real deployed URL, extracts every
 * `_app/...` and local stylesheet reference from the HTML, and fails if any
 * of them don't come back 2xx.
 *
 * Usage: node scripts/smoke-test.mjs <page-url>
 * Exits 0 and prints "SKIP" if the URL can't be reached at all (e.g. the
 * custom domain's DNS isn't configured yet) — that's a separate, expected
 * condition, not the regression this script exists to catch.
 */

const [, , pageUrlArg] = process.argv;
if (!pageUrlArg) {
	console.error('Usage: node scripts/smoke-test.mjs <page-url>');
	process.exit(1);
}

async function fetchStatus(url) {
	try {
		const res = await fetch(url, { redirect: 'follow' });
		return { url: res.url, status: res.status, ok: res.ok };
	} catch (err) {
		return { url, status: null, ok: false, error: String(err) };
	}
}

async function main() {
	const pageResult = await fetchStatus(pageUrlArg);
	if (pageResult.status === null) {
		console.log(`SKIP: could not reach ${pageUrlArg} at all (${pageResult.error}).`);
		console.log('If this is a fresh custom domain, its DNS may not be configured yet.');
		return;
	}
	if (!pageResult.ok) {
		console.error(`FAIL ${pageResult.status} ${pageResult.url}`);
		process.exit(1);
	}

	const res = await fetch(pageResult.url);
	const html = await res.text();

	const assetPaths = new Set();
	for (const match of html.matchAll(/(?:href|src)="(\.?\/?_app\/[^"]+|\.?\/?[a-z0-9]+\.css)"/gi)) {
		assetPaths.add(match[1].replace(/^\.?\//, ''));
	}

	if (assetPaths.size === 0) {
		console.error(
			'No _app/... asset references found in the HTML — check this script still matches the markup.'
		);
		process.exit(1);
	}

	const results = await Promise.all(
		[...assetPaths].map((path) => fetchStatus(new URL(path, pageResult.url).href))
	);

	for (const r of results) {
		console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.status ?? 'ERR'} ${r.url}`);
	}

	const failures = results.filter((r) => !r.ok);
	if (failures.length > 0) {
		console.error(
			`\n${failures.length}/${results.length} asset(s) failed to load. ` +
				'If every asset 404s while the page itself loads, check that .nojekyll ' +
				'is present in static/ and on the deployed branch — see the comment at the top of this file.'
		);
		process.exit(1);
	}

	console.log(`\nAll ${results.length} asset(s) loaded successfully.`);
}

main();
