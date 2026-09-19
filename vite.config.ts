import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Lets PR preview builds be served from a subpath (e.g.
			// /pr-preview/pr-42) without every internal link breaking — see
			// .github/workflows/pr-preview.yml. Empty for the production build.
			paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}` },
			// This is effectively a single page (de/fr/it are the same app,
			// not separate sections users navigate between), so the default
			// per-route code splitting just means more round trips for no
			// caching benefit — one shared JS/CSS bundle is fewer requests
			// for the exact same content.
			output: { bundleStrategy: 'single' }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
