<script lang="ts">
	import { generateHemicycleLayout } from '$lib/layout/hemicycle';
	import type { SeatEntry } from '$lib/api/seatRoster';
	import type { SeatHighlight, RoleKind } from '$lib/highlight/buildHighlightSet';
	import type { ParlGroupColor } from '$lib/api/parlGroups';
	import type { Messages } from '$lib/i18n/messages/types';
	import { translate } from '$lib/i18n';
	import { FALLBACK_PARTY_COLOR } from '$lib/config/partyColors';
	import SeatTooltip from './SeatTooltip.svelte';

	interface Props {
		seatCount: number;
		arcCount: number;
		roster: SeatEntry[];
		highlights: SeatHighlight[];
		partyColors: Map<number, ParlGroupColor>;
		hiddenGroups: Set<number>;
		messages: Messages;
		title: string;
	}

	let {
		seatCount,
		arcCount,
		roster,
		highlights,
		partyColors,
		hiddenGroups,
		messages,
		title
	}: Props = $props();

	const SEAT_RADIUS = 11;
	/** Fixed draw order + visual encoding (color AND dash pattern, not color alone) for stacked role rings. */
	const ROLE_ORDER: RoleKind[] = ['contester', 'submitter', 'rapporteur'];
	const ROLE_STYLE: Record<RoleKind, { color: string; dash: string | undefined }> = {
		contester: { color: 'var(--color-highlight-ring)', dash: '1 2' },
		submitter: { color: 'var(--color-accent)', dash: '3 2' },
		rapporteur: { color: '#2e7d32', dash: undefined }
	};

	const positions = $derived(generateHemicycleLayout(seatCount, arcCount));
	const rosterByNumber = $derived(new Map(roster.map((s) => [s.seatNumber, s])));
	const highlightByNumber = $derived(new Map(highlights.map((h) => [h.seatNumber, h])));

	const bounds = $derived.by(() => {
		const pad = SEAT_RADIUS + 14;
		if (positions.length === 0) return { minX: -pad, maxX: pad, minY: -pad, maxY: pad };
		const xs = positions.map((p) => p.x);
		const ys = positions.map((p) => p.y);
		return {
			minX: Math.min(...xs) - pad,
			maxX: Math.max(...xs) + pad,
			minY: Math.min(...ys) - pad,
			maxY: SEAT_RADIUS + 20
		};
	});

	const viewBox = $derived(
		`${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`
	);

	let activeSeatNumber = $state<number | null>(null);

	const activeSeat = $derived.by(() => {
		if (activeSeatNumber === null) return null;
		const seat = rosterByNumber.get(activeSeatNumber);
		if (!seat) return null;
		return { seat, highlight: highlightByNumber.get(activeSeatNumber) ?? null };
	});

	function sortedRoles(roles: { kind: RoleKind; businessShortNumber: string }[]) {
		return [...roles].sort((a, b) => ROLE_ORDER.indexOf(a.kind) - ROLE_ORDER.indexOf(b.kind));
	}

	function ariaLabelFor(seat: SeatEntry | undefined, highlight: SeatHighlight | undefined): string {
		if (!seat) return '';
		const name = `${seat.firstName} ${seat.lastName}`;
		if (!highlight) return name;
		// Dedupe to unique role kinds for the accessible name — a seat can hold
		// the same role (e.g. "Bekämpft von") across several affairs, and the
		// full per-affair breakdown belongs in the tooltip, not repeated here.
		const uniqueKinds = [...new Set(sortedRoles(highlight.roles).map((r) => r.kind))];
		const roles = uniqueKinds.map((kind) => translate(messages, `roles.${kind}`)).join(', ');
		return `${name} — ${roles}`;
	}
</script>

<section class="seat-chart" aria-labelledby={`${title}-heading`}>
	<h2 id={`${title}-heading`}>{title}</h2>
	<svg {viewBox} role="img" aria-label={title}>
		<rect
			x={bounds.minX}
			y={bounds.minY}
			width={bounds.maxX - bounds.minX}
			height={bounds.maxY - bounds.minY}
			rx="12"
			class="hemicycle-bg"
		/>
		{#each positions as pos (pos.seatNumber)}
			{@const seat = rosterByNumber.get(pos.seatNumber)}
			{@const highlight = highlightByNumber.get(pos.seatNumber)}
			{@const groupColor =
				seat?.parlGroupNumber != null
					? (partyColors.get(seat.parlGroupNumber)?.color ?? FALLBACK_PARTY_COLOR)
					: FALLBACK_PARTY_COLOR}
			{@const dimmed = seat?.parlGroupNumber != null && hiddenGroups.has(seat.parlGroupNumber)}
			<g
				transform={`translate(${pos.x}, ${pos.y})`}
				class="seat"
				class:dimmed
				role="button"
				tabindex="0"
				aria-label={ariaLabelFor(seat, highlight)}
				data-seat-number={pos.seatNumber}
				onmouseenter={() => (activeSeatNumber = pos.seatNumber)}
				onmouseleave={() => (activeSeatNumber = null)}
				onfocus={() => (activeSeatNumber = pos.seatNumber)}
				onblur={() => (activeSeatNumber = null)}
			>
				{#if highlight}
					{#each sortedRoles(highlight.roles) as role, i (role.kind + role.businessShortNumber)}
						<circle
							r={SEAT_RADIUS + 3 + i * 3}
							fill="none"
							stroke={ROLE_STYLE[role.kind].color}
							stroke-width="2"
							stroke-dasharray={ROLE_STYLE[role.kind].dash}
						/>
					{/each}
				{/if}
				<circle r={SEAT_RADIUS} fill={groupColor} class="seat-fill" />
			</g>
		{/each}
	</svg>
	{#if activeSeat}
		<SeatTooltip seat={activeSeat.seat} highlight={activeSeat.highlight} {messages} />
	{/if}
</section>

<style>
	.seat-chart h2 {
		font-size: 1.1rem;
		margin: 0 0 var(--space-2);
	}
	svg {
		width: 100%;
		height: auto;
		max-width: 640px;
	}
	.hemicycle-bg {
		fill: var(--color-hemicycle-bg);
		opacity: 0.35;
	}
	.seat-fill {
		stroke: var(--color-seat-divider);
		stroke-width: 1.5;
	}
	.seat {
		cursor: pointer;
		outline: none;
	}
	.seat:focus-visible .seat-fill {
		stroke: var(--color-accent-dark);
		stroke-width: 2.5;
	}
	.seat.dimmed {
		opacity: 0.25;
	}
</style>
