<script lang="ts">
	import { getSeatPosition, getChamberBounds } from '$lib/layout/hemicycle';
	import type { SeatEntry } from '$lib/api/seatRoster';
	import type { SeatHighlight, RoleKind } from '$lib/highlight/buildHighlightSet';
	import type { ParlGroupColor } from '$lib/api/parlGroups';
	import type { Chamber } from '$lib/api/types';
	import type { Messages } from '$lib/i18n/messages/types';
	import { translate } from '$lib/i18n';
	import { FALLBACK_PARTY_COLOR } from '$lib/config/partyColors';
	import SeatTooltip from './SeatTooltip.svelte';

	interface Props {
		chamber: Chamber;
		roster: SeatEntry[];
		highlights: SeatHighlight[];
		partyColors: Map<number, ParlGroupColor>;
		messages: Messages;
		title: string;
	}

	let { chamber, roster, highlights, partyColors, messages, title }: Props = $props();

	// Wider than tall and rotated tangentially to the seat's angle from the
	// podium, so tiles read as following the real arcs rather than a sparse
	// field of diamonds.
	const SEAT_WIDTH = 13;
	const SEAT_HEIGHT = 9;
	/** Fixed draw order + visual encoding (color AND dash pattern, not color alone) for stacked role rings. */
	const ROLE_ORDER: RoleKind[] = ['contester', 'submitter', 'rapporteur'];
	const ROLE_STYLE: Record<RoleKind, { color: string; dash: string | undefined }> = {
		contester: { color: 'var(--color-highlight-ring)', dash: '1 2' },
		submitter: { color: 'var(--color-accent)', dash: '3 2' },
		rapporteur: { color: '#2e7d32', dash: undefined }
	};

	interface PlacedSeat {
		seat: SeatEntry;
		x: number;
		y: number;
		angleRad: number;
	}

	const placedSeats = $derived.by((): PlacedSeat[] => {
		const placed: PlacedSeat[] = [];
		for (const seat of roster) {
			const pos = getSeatPosition(chamber, seat.seatNumber);
			if (!pos) continue; // Not part of the digitized real seat plan (shouldn't happen for a current member).
			placed.push({ seat, x: pos.x, y: pos.y, angleRad: pos.angleRad });
		}
		return placed;
	});

	const highlightByNumber = $derived(new Map(highlights.map((h) => [h.seatNumber, h])));
	const rosterByNumber = $derived(new Map(roster.map((s) => [s.seatNumber, s])));

	const bounds = $derived.by(() => {
		const pad = SEAT_WIDTH + 10;
		const b = getChamberBounds(chamber);
		return {
			minX: b.minX - pad,
			maxX: b.maxX + pad,
			minY: b.minY - pad,
			maxY: b.maxY + pad
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
		{#each placedSeats as placed (placed.seat.seatNumber)}
			{@const seat = placed.seat}
			{@const highlight = highlightByNumber.get(seat.seatNumber)}
			{@const groupColor =
				seat.parlGroupNumber != null
					? (partyColors.get(seat.parlGroupNumber)?.color ?? FALLBACK_PARTY_COLOR)
					: FALLBACK_PARTY_COLOR}
			{@const rotateDeg = (placed.angleRad * 180) / Math.PI - 90}
			<g
				transform={`translate(${placed.x}, ${placed.y})`}
				class="seat"
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
							r={SEAT_WIDTH / 2 + 4 + ringIndex * 3}
							fill="none"
							stroke={ROLE_STYLE[role.kind].color}
							stroke-width="2"
							stroke-dasharray={ROLE_STYLE[role.kind].dash}
						/>
					{/each}
				{/if}
				<rect
					transform={`rotate(${rotateDeg})`}
					x={-SEAT_WIDTH / 2}
					y={-SEAT_HEIGHT / 2}
					width={SEAT_WIDTH}
					height={SEAT_HEIGHT}
					rx="1"
					fill={groupColor}
					class="seat-fill"
					class:highlighted={!!highlight}
				/>
			</g>
		{/each}
	</svg>
	<div class="tooltip-slot">
		{#if activeSeat}
			<SeatTooltip seat={activeSeat.seat} highlight={activeSeat.highlight} {messages} />
		{/if}
	</div>
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
		.seat-chart h2 {
			font-size: 0.9rem;
			margin: 0 0 4px;
		}
		svg {
			/* Bound by height, not width — at full page width this chart's
			   aspect ratio would alone be taller than an A4 landscape page. */
			width: auto;
			height: 6.2cm;
			max-width: 100%;
			margin: 0 auto;
		}
	}
	.hemicycle-bg {
		fill: var(--color-hemicycle-bg);
		opacity: 0.35;
	}
	.seat-fill {
		stroke: var(--color-seat-divider);
		stroke-width: 0.75;
		fill-opacity: 0.6;
	}
	.seat-fill.highlighted {
		fill-opacity: 1;
	}
	.seat {
		cursor: pointer;
		outline: none;
	}
	.seat:focus-visible .seat-fill {
		stroke: var(--color-accent-dark);
		stroke-width: 2;
	}
	/* Reserves space for the tooltip so hovering/focusing a seat never
	   reflows the rest of the page — the tooltip is absolutely positioned
	   inside this fixed-height slot instead of being inserted into flow. */
	.tooltip-slot {
		position: relative;
		min-height: 110px;
	}
	.tooltip-slot :global(.seat-tooltip) {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}
	@media print {
		/* The print view has its own static, named roster instead (see
		   .highlighted-list in +page.svelte) — the hover-only tooltip slot
		   would otherwise waste vertical space toward fitting one page. */
		.tooltip-slot {
			display: none;
		}
	}
</style>
