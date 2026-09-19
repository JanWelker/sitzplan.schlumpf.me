<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { LayoutData } from './$types';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SeatChart from '$lib/components/SeatChart.svelte';
	import { buildHighlightSet, type HighlightSet } from '$lib/highlight/buildHighlightSet';
	import { fetchSeatRoster, type SeatEntry } from '$lib/api/seatRoster';
	import { fetchParlGroupColorIndex, type ParlGroupColor } from '$lib/api/parlGroups';
	import { translate } from '$lib/i18n';

	let { data }: { data: LayoutData } = $props();
	const messages = $derived(data.messages);
	const locale = $derived(data.locale);

	let searchValue = $state('');
	let loading = $state(false);
	let hasSearched = $state(false);
	let result = $state<HighlightSet | null>(null);
	let nrRoster = $state<SeatEntry[]>([]);
	let srRoster = $state<SeatEntry[]>([]);
	let parlGroupIndex = $state<Map<number, ParlGroupColor>>(new Map());
	let fetchedAt = $state<Date | null>(null);
	let loadError = $state(false);

	async function runSearch(value: string) {
		const trimmed = value.trim();
		searchValue = trimmed;
		hasSearched = true;
		loading = true;
		loadError = false;
		goto(resolve(`/[lang]?a=${encodeURIComponent(trimmed)}`, { lang: locale }), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});

		try {
			const [highlightSet, nr, sr, colors] = await Promise.all([
				buildHighlightSet(trimmed, locale),
				fetchSeatRoster('nr', locale),
				fetchSeatRoster('sr', locale),
				fetchParlGroupColorIndex(locale)
			]);
			result = highlightSet;
			nrRoster = nr;
			srRoster = sr;
			parlGroupIndex = colors;
			fetchedAt = new Date();
		} catch {
			loadError = true;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const initial = page.url.searchParams.get('a');
		if (initial) {
			searchValue = initial;
			runSearch(initial);
		}
	});

	const dateLabel = $derived(fetchedAt ? fetchedAt.toLocaleDateString(locale) : '');

	function unseatedReasonKey(reason: string): string {
		return reason === 'not-currently-seated' ? 'notCurrentlySeated' : reason;
	}

	function partyAbbreviation(parlGroupNumber: number | null): string {
		if (parlGroupNumber == null) return '';
		return parlGroupIndex.get(parlGroupNumber)?.abbreviation ?? '';
	}

	function rolesLabel(roles: { kind: string }[]): string {
		const uniqueKinds = [...new Set(roles.map((r) => r.kind))];
		return uniqueKinds.map((kind) => translate(messages, `roles.${kind}`)).join(', ');
	}

	function printPage() {
		window.print();
	}

	const hasHighlights = $derived((result?.nr.length ?? 0) > 0 || (result?.sr.length ?? 0) > 0);
</script>

<svelte:head>
	<title>{translate(messages, 'appTitle')}</title>
</svelte:head>

<p class="tagline no-print">{translate(messages, 'tagline')}</p>

<div class="no-print">
	<SearchBar bind:value={searchValue} onSubmit={runSearch} {messages} {loading} />
</div>

{#if loading}
	<p class="status no-print">{translate(messages, 'loading')}</p>
{:else if loadError || result?.rosterUnavailable}
	<p class="status error no-print">{translate(messages, 'errors.rosterUnavailable')}</p>
{:else if hasSearched && result}
	<p class="print-only searched-numbers">
		{translate(messages, 'print.searchedNumbers', { numbers: searchValue })}
	</p>

	{#if hasHighlights}
		<div class="toolbar no-print">
			<button type="button" class="print-button" onclick={printPage}>
				{translate(messages, 'print.button')}
			</button>
		</div>
	{/if}

	{#if result.parseErrors.length > 0 || result.businessErrors.length > 0}
		<ul class="issues">
			{#each result.parseErrors as token (token)}
				<li>{translate(messages, 'errors.invalidNumber', { number: token })}</li>
			{/each}
			{#each result.businessErrors as err (err.shortNumber)}
				<li>{translate(messages, 'errors.businessNotFound', { number: err.shortNumber })}</li>
			{/each}
		</ul>
	{/if}

	{#if result.nr.length === 0 && result.sr.length === 0 && result.unseated.length === 0 && result.businessErrors.length === 0 && result.parseErrors.length === 0}
		<p class="status">{translate(messages, 'noResults')}</p>
	{/if}

	<div class="charts">
		{#if result.nr.length > 0}
			<div class="chart-block">
				<SeatChart
					chamber="nr"
					roster={nrRoster}
					highlights={result.nr}
					partyColors={parlGroupIndex}
					{messages}
					title={translate(messages, 'chambers.nr')}
				/>
				<div class="print-only highlighted-list">
					<h3>
						{translate(messages, 'print.highlightedTitle')} — {translate(messages, 'chambers.nr')}
					</h3>
					<ul>
						{#each result.nr as h (h.seatNumber)}
							<li>
								<strong>{h.firstName} {h.lastName}</strong>
								<span
									>{translate(messages, 'seatTooltip.canton')}: {h.cantonAbbreviation ?? '–'} ·
									{partyAbbreviation(h.parlGroupNumber)}</span
								>
								<span>{rolesLabel(h.roles)}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
		{#if result.sr.length > 0}
			<div class="chart-block">
				<SeatChart
					chamber="sr"
					roster={srRoster}
					highlights={result.sr}
					partyColors={parlGroupIndex}
					{messages}
					title={translate(messages, 'chambers.sr')}
				/>
				<div class="print-only highlighted-list">
					<h3>
						{translate(messages, 'print.highlightedTitle')} — {translate(messages, 'chambers.sr')}
					</h3>
					<ul>
						{#each result.sr as h (h.seatNumber)}
							<li>
								<strong>{h.firstName} {h.lastName}</strong>
								<span
									>{translate(messages, 'seatTooltip.canton')}: {h.cantonAbbreviation ?? '–'} ·
									{partyAbbreviation(h.parlGroupNumber)}</span
								>
								<span>{rolesLabel(h.roles)}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
	</div>

	{#if result.unseated.length > 0}
		<section class="unseated">
			<h2>{translate(messages, 'unseated.title')}</h2>
			<ul>
				{#each result.unseated as entry (entry.key)}
					<li>
						<strong>{entry.displayName}</strong>
						<span class="reason"
							>({translate(messages, `unseated.${unseatedReasonKey(entry.reason)}`)})</span
						>
						<span class="roles">
							{entry.roles.map((r) => translate(messages, `roles.${r.kind}`)).join(', ')}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if fetchedAt}
		<p class="source">{translate(messages, 'footer.source', { date: dateLabel })}</p>
	{/if}
{/if}

<style>
	.tagline {
		color: var(--color-text-muted);
		margin-top: 0;
	}
	.status {
		margin-top: var(--space-3);
	}
	.status.error {
		color: var(--color-danger);
		background: var(--color-danger-bg);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
	}
	.issues {
		color: var(--color-danger);
		font-size: 0.875rem;
	}
	.toolbar {
		margin-top: var(--space-3);
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
	.searched-numbers {
		font-weight: 600;
		margin-bottom: var(--space-3);
	}
	.charts {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		margin-top: var(--space-4);
	}
	.highlighted-list h3 {
		font-size: 0.85rem;
		margin: var(--space-2) 0 var(--space-1);
	}
	.highlighted-list ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		column-gap: var(--space-3);
		row-gap: 2px;
	}
	.highlighted-list li {
		padding: 2px 0;
		font-size: 0.68rem;
		line-height: 1.25;
		display: flex;
		flex-direction: column;
	}
	@media print {
		.highlighted-list ul {
			grid-template-columns: repeat(4, 1fr);
			row-gap: 0;
		}
		.highlighted-list li {
			font-size: 0.6rem;
			line-height: 1.15;
			padding: 1px 0;
		}
	}
	@media print {
		.searched-numbers {
			margin: 4px 0;
		}
		.charts {
			margin-top: 4px;
			gap: var(--space-3);
		}
		.chart-block {
			flex-basis: 100%;
			page-break-inside: avoid;
		}
		.unseated,
		.source {
			font-size: 0.65rem;
			margin-top: var(--space-2);
		}
		.unseated h2 {
			font-size: 0.85rem;
			margin: var(--space-1) 0;
		}
		.unseated ul {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			column-gap: var(--space-4);
		}
		.unseated li {
			padding: 1px 0;
		}
	}
	.unseated {
		margin-top: var(--space-4);
	}
	.unseated ul {
		list-style: none;
		padding: 0;
	}
	.unseated li {
		padding: var(--space-1) 0;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
	}
	.reason {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}
	.roles {
		font-size: 0.85rem;
	}
	.source {
		margin-top: var(--space-4);
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
</style>
