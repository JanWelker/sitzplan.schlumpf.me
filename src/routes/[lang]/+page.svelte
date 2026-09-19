<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import type { LayoutData } from './$types';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SeatChart from '$lib/components/SeatChart.svelte';
	import Legend from '$lib/components/Legend.svelte';
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
	const hiddenGroups: Set<number> = new SvelteSet();
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

	function toggleGroup(parlGroupNumber: number) {
		if (hiddenGroups.has(parlGroupNumber)) hiddenGroups.delete(parlGroupNumber);
		else hiddenGroups.add(parlGroupNumber);
	}

	const groupList = $derived(
		[...parlGroupIndex.values()].sort((a, b) => a.parlGroupNumber - b.parlGroupNumber)
	);

	function countsFor(roster: SeatEntry[]): Map<number, number> {
		// Transient scratch value recomputed inside $derived.by below — never
		// stored as $state or mutated after this function returns, so a plain
		// Map (not SvelteMap) is the right, lower-overhead choice here.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const counts = new Map<number, number>();
		for (const seat of roster) {
			if (seat.parlGroupNumber == null) continue;
			counts.set(seat.parlGroupNumber, (counts.get(seat.parlGroupNumber) ?? 0) + 1);
		}
		return counts;
	}

	const combinedCounts = $derived.by(() => {
		const counts = countsFor(nrRoster);
		for (const [groupNumber, count] of countsFor(srRoster)) {
			counts.set(groupNumber, (counts.get(groupNumber) ?? 0) + count);
		}
		return counts;
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

	{#if groupList.length > 0 && (result.nr.length > 0 || result.sr.length > 0)}
		<Legend
			groups={groupList}
			counts={combinedCounts}
			{hiddenGroups}
			onToggle={toggleGroup}
			{messages}
		/>
	{/if}

	<div class="charts">
		{#if result.nr.length > 0}
			<div class="chart-block">
				<SeatChart
					arcCount={8}
					roster={nrRoster}
					highlights={result.nr}
					partyColors={parlGroupIndex}
					{hiddenGroups}
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
					arcCount={5}
					roster={srRoster}
					highlights={result.sr}
					partyColors={parlGroupIndex}
					{hiddenGroups}
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
		flex-wrap: wrap;
		gap: var(--space-5);
		margin-top: var(--space-4);
	}
	.chart-block {
		flex: 1 1 420px;
		min-width: 280px;
	}
	.highlighted-list h3 {
		font-size: 0.95rem;
		margin: var(--space-3) 0 var(--space-2);
	}
	.highlighted-list ul {
		list-style: none;
		margin: 0;
		padding: 0;
		columns: 2;
		column-gap: var(--space-4);
	}
	.highlighted-list li {
		break-inside: avoid;
		padding: var(--space-1) 0;
		font-size: 0.8rem;
		display: flex;
		flex-direction: column;
	}
	@media print {
		.chart-block {
			flex-basis: 100%;
			page-break-inside: avoid;
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
