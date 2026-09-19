<script lang="ts">
	import type { SeatEntry } from '$lib/api/seatRoster';
	import type { SeatHighlight } from '$lib/highlight/buildHighlightSet';
	import type { Messages } from '$lib/i18n/messages/types';
	import { translate } from '$lib/i18n';

	interface Props {
		seat: SeatEntry;
		highlight: SeatHighlight | null;
		messages: Messages;
	}

	let { seat, highlight, messages }: Props = $props();
</script>

<div class="seat-tooltip" role="status">
	<strong>{seat.firstName} {seat.lastName}</strong>
	<div class="meta">
		{#if seat.cantonAbbreviation}
			<span>{translate(messages, 'seatTooltip.canton')}: {seat.cantonAbbreviation}</span>
		{/if}
		{#if seat.parlGroupName}
			<span>{translate(messages, 'seatTooltip.party')}: {seat.parlGroupName}</span>
		{/if}
	</div>
	{#if highlight && highlight.roles.length > 0}
		<ul class="roles">
			{#each highlight.roles as role (role.kind + role.businessShortNumber)}
				<li>{translate(messages, `roles.${role.kind}`)} — {role.businessShortNumber}</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.seat-tooltip {
		margin-top: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		max-width: 24rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin-top: var(--space-1);
	}
	.roles {
		margin: var(--space-2) 0 0;
		padding-left: 1.1rem;
		font-size: 0.875rem;
	}
</style>
