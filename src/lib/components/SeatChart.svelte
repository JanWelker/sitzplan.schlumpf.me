<script lang="ts">
	import { generateGroupedHemicycleLayout } from '$lib/layout/hemicycle';
	import type { SeatEntry } from '$lib/api/seatRoster';
	import type { SeatHighlight, RoleKind } from '$lib/highlight/buildHighlightSet';
	import type { ParlGroupColor } from '$lib/api/parlGroups';
	import type { Messages } from '$lib/i18n/messages/types';
	import { translate } from '$lib/i18n';
	import { FALLBACK_PARTY_COLOR } from '$lib/config/partyColors';
	import SeatTooltip from './SeatTooltip.svelte';

	interface Props {
		arcCount: number;
		roster: SeatEntry[];
		highlights: SeatHighlight[];
		partyColors: Map<number, ParlGroupColor>;
		hiddenGroups: Set<number>;
		messages: Messages;
		title: string;
	}

	let { arcCount, roster, highlights, partyColors, hiddenGroups, messages, title }: Props =
		$props();

	const SEAT_SIZE = 15;
	/** Fixed draw order + visual encoding (color AND dash pattern, not color alone) for stacked role rings. */
	const ROLE_ORDER: RoleKind[] = ['contester', 'submitter', 'rapporteur'];
	const ROLE_STYLE: Record<RoleKind, { color: string; dash: string | undefined }> = {
		contester: { color: 'var(--color-highlight-ring)', dash: '1 2' },
		submitter: { color: 'var(--color-accent)', dash: '3 2' },
		rapporteur: { color: '#2e7d32', dash: undefined }
	};

	/**
	 * Political-spectrum order, right to left (angle 0 = rightmost, increasing
	 * toward the left) — so e.g. SVP renders on the right and SP on the left,
	 * matching how Swiss media conventionally draw the chamber. Any group not
	 * in this list (independents, a newly formed group) sorts after the
	 * rightmost known group, ordered by ParlGroupNumber for stability.
	 */
	const CANONICAL_GROUP_ORDER = ['V', 'RL', 'M-E', 'GL', 'G', 'S'];

	function groupOrderIndex(parlGroupNumber: number | null): number {
		const abbreviation =
			parlGroupNumber != null ? partyColors.get(parlGroupNumber)?.abbreviation : undefined;
		const index = abbreviation ? CANONICAL_GROUP_ORDER.indexOf(abbreviation) : -1;
		return index === -1 ? CANONICAL_GROUP_ORDER.length : index;
	}

	interface SeatGroup {
		parlGroupNumber: number | null;
		seats: SeatEntry[];
	}

	const groupedSeats = $derived.by((): SeatGroup[] => {
		// Transient scratch value, discarded once flattened into the returned
		// array below — never stored as $state, so a plain Map is correct.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const byGroup = new Map<number | null, SeatEntry[]>();
		for (const seat of roster) {
			const key = seat.parlGroupNumber;
			const list = byGroup.get(key);
			if (list) list.push(seat);
			else byGroup.set(key, [seat]);
		}
		return [...byGroup.entries()]
			.map(([parlGroupNumber, seats]) => ({
				parlGroupNumber,
				seats: [...seats].sort((a, b) => a.seatNumber - b.seatNumber)
			}))
			.sort((a, b) => {
				const orderDiff = groupOrderIndex(a.parlGroupNumber) - groupOrderIndex(b.parlGroupNumber);
				if (orderDiff !== 0) return orderDiff;
				return (a.parlGroupNumber ?? 0) - (b.parlGroupNumber ?? 0);
			});
	});

	const orderedSeats = $derived(groupedSeats.flatMap((g) => g.seats));
	const positions = $derived(
		generateGroupedHemicycleLayout(
			groupedSeats.map((g) => g.seats.length),
			arcCount
		)
	);

	const rosterByNumber = $derived(new Map(roster.map((s) => [s.seatNumber, s])));
	const highlightByNumber = $derived(new Map(highlights.map((h) => [h.seatNumber, h])));

	const bounds = $derived.by(() => {
		const pad = SEAT_SIZE + 14;
		if (positions.length === 0) return { minX: -pad, maxX: pad, minY: -pad, maxY: pad };
		const xs = positions.map((p) => p.x);
		const ys = positions.map((p) => p.y);
		return {
			minX: Math.min(...xs) - pad,
			maxX: Math.max(...xs) + pad,
			minY: Math.min(...ys) - pad,
			maxY: SEAT_SIZE + 20
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

	function ariaLabelFor(seat: SeatEntry, highlight: SeatHighlight | undefined): string {
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
		{#each orderedSeats as seat, i (seat.seatNumber)}
			{@const pos = positions[i]}
			{@const highlight = highlightByNumber.get(seat.seatNumber)}
			{@const groupColor =
				seat.parlGroupNumber != null
					? (partyColors.get(seat.parlGroupNumber)?.color ?? FALLBACK_PARTY_COLOR)
					: FALLBACK_PARTY_COLOR}
			{@const dimmed = seat.parlGroupNumber != null && hiddenGroups.has(seat.parlGroupNumber)}
			{@const rotateDeg = (pos.angleRad * 180) / Math.PI - 90}
			<g
				transform={`translate(${pos.x}, ${pos.y})`}
				class="seat"
				class:dimmed
				role="button"
				tabindex="0"
				aria-label={ariaLabelFor(seat, highlight)}
				data-seat-number={seat.seatNumber}
				onmouseenter={() => (activeSeatNumber = seat.seatNumber)}
				onmouseleave={() => (activeSeatNumber = null)}
				onfocus={() => (activeSeatNumber = seat.seatNumber)}
				onblur={() => (activeSeatNumber = null)}
			>
				{#if highlight}
					{#each sortedRoles(highlight.roles) as role, ringIndex (role.kind + role.businessShortNumber)}
						<circle
							r={SEAT_SIZE / 2 + 4 + ringIndex * 3}
							fill="none"
							stroke={ROLE_STYLE[role.kind].color}
							stroke-width="2"
							stroke-dasharray={ROLE_STYLE[role.kind].dash}
						/>
					{/each}
				{/if}
				<rect
					transform={`rotate(${rotateDeg})`}
					x={-SEAT_SIZE / 2}
					y={-SEAT_SIZE / 2}
					width={SEAT_SIZE}
					height={SEAT_SIZE}
					rx="1.5"
					fill={groupColor}
					class="seat-fill"
				/>
			</g>
		{/each}
	</svg>
	{#if activeSeat}
		<SeatTooltip seat={activeSeat.seat} highlight={activeSeat.highlight} {messages} />
	{/if}
</section>

<style>
	.seat-chart {
		/* SVGs in a flex container otherwise collapse to a tiny intrinsic size. */
		flex: 1 1 420px;
		min-width: 280px;
	}
	.seat-chart h2 {
		font-size: 1.1rem;
		margin: 0 0 var(--space-2);
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		max-width: 720px;
	}
	@media print {
		svg {
			max-width: 100%;
		}
	}
	.hemicycle-bg {
		fill: var(--color-hemicycle-bg);
		opacity: 0.35;
	}
	.seat-fill {
		stroke: var(--color-seat-divider);
		stroke-width: 1;
	}
	.seat {
		cursor: pointer;
		outline: none;
	}
	.seat:focus-visible .seat-fill {
		stroke: var(--color-accent-dark);
		stroke-width: 2;
	}
	.seat.dimmed {
		opacity: 0.25;
	}
</style>
