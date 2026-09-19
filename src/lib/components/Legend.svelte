<script lang="ts">
	import type { ParlGroupColor } from '$lib/api/parlGroups';
	import type { Messages } from '$lib/i18n/messages/types';
	import { translate } from '$lib/i18n';

	interface Props {
		groups: ParlGroupColor[];
		counts: Map<number, number>;
		hiddenGroups: Set<number>;
		onToggle: (parlGroupNumber: number) => void;
		messages: Messages;
	}

	let { groups, counts, hiddenGroups, onToggle, messages }: Props = $props();
</script>

<div class="legend">
	<h3>{translate(messages, 'legend.title')}</h3>
	<div class="bar" role="img" aria-hidden="true">
		{#each groups as group (group.parlGroupNumber)}
			{@const count = counts.get(group.parlGroupNumber) ?? 0}
			{#if count > 0}
				<span class="segment" style={`background:${group.color}; flex-grow:${count}`}></span>
			{/if}
		{/each}
	</div>
	<ul class="items">
		{#each groups as group (group.parlGroupNumber)}
			{@const count = counts.get(group.parlGroupNumber) ?? 0}
			{#if count > 0}
				<li>
					<label>
						<input
							type="checkbox"
							checked={!hiddenGroups.has(group.parlGroupNumber)}
							onchange={() => onToggle(group.parlGroupNumber)}
						/>
						<span class="swatch" style={`background:${group.color}`}></span>
						{group.abbreviation} · {count}
					</label>
				</li>
			{/if}
		{/each}
	</ul>
</div>

<style>
	.legend {
		font-size: 0.875rem;
	}
	h3 {
		margin: 0 0 var(--space-2);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}
	.bar {
		display: flex;
		height: 8px;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: var(--space-2);
	}
	.items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-3);
	}
	label {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		cursor: pointer;
	}
	.swatch {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 2px;
	}
</style>
