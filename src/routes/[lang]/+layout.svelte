<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { resolve } from '$app/paths';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { translate } from '$lib/i18n';
	import { printControl } from '$lib/stores/printControl.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const messages = $derived(data.messages);
	const locale = $derived(data.locale);
	const homeHref = $derived(resolve('/[lang]', { lang: locale }));
</script>

<div class="app-shell">
	<header>
		<a class="brand" href={homeHref}>{translate(messages, 'appTitle')}</a>
		<div class="header-actions no-print">
			{#if printControl.visible}
				<button type="button" class="print-button" onclick={() => printControl.onPrint?.()}>
					{translate(messages, 'print.button')}
				</button>
			{/if}
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
	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.print-button {
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-accent-dark);
		font-weight: 600;
		cursor: pointer;
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
