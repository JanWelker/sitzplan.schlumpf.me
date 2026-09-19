<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { detectLocale, SUPPORTED_LOCALES } from '$lib/i18n';

	onMount(() => {
		const locale = detectLocale(navigator.language);
		const query = location.search.slice(1);
		const target = query
			? resolve(`/[lang]?${query}`, { lang: locale })
			: resolve('/[lang]', { lang: locale });
		goto(target, { replaceState: true });
	});

	const noscriptLinks = SUPPORTED_LOCALES.map((locale) => ({
		locale,
		href: resolve('/[lang]', { lang: locale })
	}));
</script>

<noscript>
	<p class="noscript-links">
		{#each noscriptLinks as { locale, href } (locale)}
			<a {href}>{locale.toUpperCase()}</a>
		{/each}
	</p>
</noscript>

<style>
	.noscript-links {
		display: flex;
		gap: 0.5rem;
	}
</style>
