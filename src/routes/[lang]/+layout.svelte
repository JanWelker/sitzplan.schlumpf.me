<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { resolve } from '$app/paths';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { translate } from '$lib/i18n';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const messages = $derived(data.messages);
	const locale = $derived(data.locale);
	const homeHref = $derived(resolve('/[lang]', { lang: locale }));
</script>

<div class="app-shell">
	<header>
		<a class="brand" href={homeHref}>{translate(messages, 'appTitle')}</a>
		<div class="no-print">
			<LanguageSwitcher currentLocale={locale} {messages} />
		</div>
	</header>
	<main>
		{@render children()}
	</main>
	<footer>
		<p>{translate(messages, 'footer.disclaimer')}</p>
	</footer>
</div>

<style>
	.app-shell {
		max-width: 960px;
		margin: 0 auto;
		padding: var(--space-4) var(--space-3);
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-5);
	}
	.brand {
		font-weight: 700;
		font-size: 1.25rem;
		text-decoration: none;
		color: var(--color-text);
	}
	main {
		flex: 1;
	}
	footer {
		margin-top: var(--space-5);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border);
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	@media print {
		.app-shell {
			max-width: none;
			min-height: auto;
			padding: 0;
		}
		header {
			margin-bottom: var(--space-2);
		}
		footer {
			margin-top: var(--space-2);
			padding-top: var(--space-1);
		}
	}
</style>
