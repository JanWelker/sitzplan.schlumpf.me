<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { SUPPORTED_LOCALES } from '$lib/i18n';
	import type { Locale } from '$lib/api/types';
	import type { Messages } from '$lib/i18n/messages/types';
	import { translate } from '$lib/i18n';

	interface Props {
		currentLocale: Locale;
		messages: Messages;
	}

	let { currentLocale, messages }: Props = $props();

	// The app has exactly one page per language (`/[lang]`), so switching
	// languages only ever needs to preserve the query string (the current
	// search), not an arbitrary current pathname.
	function hrefFor(locale: Locale): ResolvedPathname {
		// page.url.search is inaccessible during prerendering; only meaningful
		// once the user has actually searched, i.e. after hydration.
		const query = browser ? page.url.search.slice(1) : '';
		return query
			? resolve(`/[lang]?${query}`, { lang: locale })
			: resolve('/[lang]', { lang: locale });
	}
</script>

<nav class="language-switcher" aria-label={translate(messages, 'languageSwitcher.label')}>
	{#each SUPPORTED_LOCALES as locale (locale)}
		<a href={hrefFor(locale)} aria-current={locale === currentLocale ? 'true' : undefined}>
			{locale.toUpperCase()}
		</a>
	{/each}
</nav>

<style>
	.language-switcher {
		display: flex;
		gap: var(--space-2);
	}
	a {
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		color: var(--color-text-muted);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
	}
	a[aria-current='true'] {
		color: var(--color-accent-dark);
		background: var(--color-surface);
	}
</style>
