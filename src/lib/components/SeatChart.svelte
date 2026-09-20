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

	// Plain circles — rotation-free by construction, so there's no risk of
	// the "twisted" look a rotated rectangle/square gets wherever a row
	// curves sharply (the outer arcs).
	const SEAT_SIZE = 11;
	/** Fixed draw order + visual encoding (color AND dash pattern, not color alone) for stacked role rings. */
	const ROLE_ORDER: RoleKind[] = ['contester', 'submitter', 'rapporteur'];
	const ROLE_STYLE: Record<RoleKind, { color: string; dash: string | undefined }> = {
		contester: { color: 'var(--color-highlight-ring)', dash: '1 2' },
		submitter: { color: 'var(--color-accent)', dash: '3 2' },
		rapporteur: { color: '#2e7d32', dash: undefined }
	};
	/** Gap enforced between two bubbles' rendered boxes when resolving overlaps, in px. */
	const BUBBLE_GAP = 6;
	/** Horizontal gap between a seat and the bubble anchored to it, in px. */
	const BUBBLE_OFFSET = 10;
	/** Minimum gap kept between a bubble and the edge of the viewport, in px. */
	const VIEWPORT_MARGIN = 8;

	interface PlacedSeat {
		seat: SeatEntry;
		x: number;
		y: number;
	}

	const placedSeats = $derived.by((): PlacedSeat[] => {
		const placed: PlacedSeat[] = [];
		for (const seat of roster) {
			const pos = getSeatPosition(chamber, seat.seatNumber);
			if (!pos) continue; // Not part of the digitized real seat plan (shouldn't happen for a current member).
			placed.push({ seat, x: pos.x, y: pos.y });
		}
		return placed;
	});

	const highlightByNumber = $derived(new Map(highlights.map((h) => [h.seatNumber, h])));

	const bounds = $derived.by(() => {
		const pad = SEAT_SIZE + 10;
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
	const aspectRatio = $derived(`${bounds.maxX - bounds.minX} / ${bounds.maxY - bounds.minY}`);

	let activeSeatNumber = $state<number | null>(null);

	interface Bubble {
		seatNumber: number;
		seat: SeatEntry;
		highlight: SeatHighlight | null;
		x: number;
		y: number;
		/** Highlighted seats (the ones with a role ring) keep their bubble open permanently. */
		pinned: boolean;
	}

	// Every highlighted ("of interest") seat gets a permanently open bubble;
	// whatever seat is currently hovered/focused gets one too, unless it's
	// already pinned.
	const visibleBubbles = $derived.by((): Bubble[] => {
		const bubbles: Record<number, Bubble> = {};
		for (const placed of placedSeats) {
			const highlight = highlightByNumber.get(placed.seat.seatNumber);
			if (highlight) {
				bubbles[placed.seat.seatNumber] = {
					seatNumber: placed.seat.seatNumber,
					seat: placed.seat,
					highlight,
					x: placed.x,
					y: placed.y,
					pinned: true
				};
			}
		}
		if (activeSeatNumber !== null && !(activeSeatNumber in bubbles)) {
			const placed = placedSeats.find((p) => p.seat.seatNumber === activeSeatNumber);
			if (placed) {
				bubbles[activeSeatNumber] = {
					seatNumber: activeSeatNumber,
					seat: placed.seat,
					highlight: highlightByNumber.get(activeSeatNumber) ?? null,
					x: placed.x,
					y: placed.y,
					pinned: false
				};
			}
		}
		return Object.values(bubbles);
	});

	let bubbleLayerEl = $state<HTMLDivElement>();
	const bubbleEls: Record<number, HTMLElement> = {};
	let nudges = $state<Record<number, { x: number; y: number }>>({});
	let resolveScheduled = false;

	// Bubble boxes are sized by their text content, not by the chart's
	// viewBox coordinate system, so overlap resolution has to work in real
	// rendered pixels rather than viewBox units. Reset any previous nudge
	// first (so we always measure each bubble's neutral, un-nudged position
	// rather than compounding drift onto an already-adjusted one), then
	// measure and resolve on the next frame once that reset has painted.
	function scheduleResolve() {
		if (resolveScheduled) return;
		resolveScheduled = true;
		requestAnimationFrame(() => {
			nudges = {};
			requestAnimationFrame(() => {
				resolveScheduled = false;
				resolveCollisions();
			});
		});
	}

	function resolveCollisions() {
		const layerEl = bubbleLayerEl;
		if (!layerEl) return;
		const layerRect = layerEl.getBoundingClientRect();
		if (layerRect.width === 0) return;

		const items = visibleBubbles
			.map((vb) => {
				const el = bubbleEls[vb.seatNumber];
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return {
					seatNumber: vb.seatNumber,
					x0: r.left - layerRect.left,
					y0: r.top - layerRect.top,
					x1: r.right - layerRect.left,
					y1: r.bottom - layerRect.top,
					// Kept viewport-relative (not layer-relative) so a bubble can be
					// clamped back onto the actual visible screen — on a narrow
					// viewport, "next to the seat" can otherwise push a bubble's
					// text straight off the edge of the page.
					vpLeft: r.left,
					vpRight: r.right
				};
			})
			.filter((item) => item !== null);

		items.sort((a, b) => a.y0 - b.y0);
		const dy: Record<number, number> = {};
		for (const item of items) dy[item.seatNumber] = 0;

		// A handful of relaxation passes: pushing one bubble down to clear an
		// earlier one can create a new overlap further down, so repeat until
		// it settles (or we give up after a fixed number of passes).
		for (let pass = 0; pass < 4; pass++) {
			for (let i = 1; i < items.length; i++) {
				for (let j = 0; j < i; j++) {
					const a = items[j];
					const b = items[i];
					const aTop = a.y0 + dy[a.seatNumber];
					const aBottom = a.y1 + dy[a.seatNumber];
					const bTop = b.y0 + dy[b.seatNumber];
					const bBottom = b.y1 + dy[b.seatNumber];
					const overlapsX = a.x0 < b.x1 && b.x0 < a.x1;
					const overlapsY = aTop < bBottom && bTop < aBottom;
					if (overlapsX && overlapsY) {
						dy[b.seatNumber] += aBottom + BUBBLE_GAP - bTop;
					}
				}
			}
		}

		const next: Record<number, { x: number; y: number }> = {};
		for (const item of items) {
			let dx = 0;
			if (item.vpLeft < VIEWPORT_MARGIN) {
				dx = VIEWPORT_MARGIN - item.vpLeft;
			} else if (item.vpRight > window.innerWidth - VIEWPORT_MARGIN) {
				dx = window.innerWidth - VIEWPORT_MARGIN - item.vpRight;
			}
			next[item.seatNumber] = { x: dx, y: dy[item.seatNumber] ?? 0 };
		}
		nudges = next;
	}

	function registerBubbleEl(node: HTMLElement, seatNumber: number) {
		bubbleEls[seatNumber] = node;
		return {
			update(newSeatNumber: number) {
				delete bubbleEls[seatNumber];
				seatNumber = newSeatNumber;
				bubbleEls[seatNumber] = node;
			},
			destroy() {
				delete bubbleEls[seatNumber];
			}
		};
	}

	$effect(() => {
		// Re-run whenever the visible bubble set changes shape (a new search,
		// or hovering/focusing a different seat).
		void visibleBubbles;
		scheduleResolve();
	});

	$effect(() => {
		const onResize = () => scheduleResolve();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
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
	<div class="chart-canvas" style={`--aspect-ratio: ${aspectRatio}`}>
		<svg {viewBox} role="img" aria-label={title}>
			{#each placedSeats as placed (placed.seat.seatNumber)}
				{@const seat = placed.seat}
				{@const highlight = highlightByNumber.get(seat.seatNumber)}
				{@const groupColor =
					seat.parlGroupNumber != null
						? (partyColors.get(seat.parlGroupNumber)?.color ?? FALLBACK_PARTY_COLOR)
						: FALLBACK_PARTY_COLOR}
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
								r={SEAT_SIZE / 2 + 4 + ringIndex * 3}
								fill="none"
								stroke={ROLE_STYLE[role.kind].color}
								stroke-width="2"
								stroke-dasharray={ROLE_STYLE[role.kind].dash}
							/>
						{/each}
					{/if}
					<circle
						r={SEAT_SIZE / 2}
						fill={groupColor}
						class="seat-fill"
						class:highlighted={!!highlight}
					/>
				</g>
			{/each}
		</svg>
		<div class="bubble-layer" bind:this={bubbleLayerEl}>
			{#each visibleBubbles as vb (vb.seatNumber)}
				{@const leftPct = ((vb.x - bounds.minX) / (bounds.maxX - bounds.minX)) * 100}
				{@const topPct = ((vb.y - bounds.minY) / (bounds.maxY - bounds.minY)) * 100}
				{@const side = vb.x >= 0 ? 'right' : 'left'}
				{@const nudge = nudges[vb.seatNumber] ?? { x: 0, y: 0 }}
				{@const collided = Math.abs(nudge.y) > 0.5}
				<div
					class="bubble"
					class:side-right={side === 'right'}
					class:side-left={side === 'left'}
					class:tail-top={collided}
					aria-hidden={vb.pinned ? 'true' : undefined}
					style={`left:${leftPct}%; top:${topPct}%; transform: translate(${
						side === 'right'
							? `calc(${BUBBLE_OFFSET}px + ${nudge.x}px)`
							: `calc(-100% - ${BUBBLE_OFFSET}px + ${nudge.x}px)`
					}, calc(-50% + ${nudge.y}px));`}
					use:registerBubbleEl={vb.seatNumber}
				>
					<SeatTooltip seat={vb.seat} highlight={vb.highlight} {messages} />
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.seat-chart h2 {
		font-size: 1.1rem;
		margin: 0 0 var(--space-2);
	}
	.chart-canvas {
		position: relative;
		width: 100%;
		aspect-ratio: var(--aspect-ratio);
	}
	.chart-canvas svg {
		display: block;
		width: 100%;
		height: 100%;
	}
	@media print {
		.seat-chart h2 {
			font-size: 0.9rem;
			margin: 0 0 4px;
		}
		.chart-canvas {
			/* Bound by height, not width — at full page width this chart's
			   aspect ratio would alone be taller than an A4 landscape page.
			   aspect-ratio (from --aspect-ratio) still applies, so the width
			   is derived from this height automatically. */
			width: auto;
			height: 6.2cm;
			margin: 0 auto;
		}
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
	.bubble-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.bubble {
		position: absolute;
		width: max-content;
		max-width: 180px;
	}
	.bubble :global(.seat-tooltip) {
		position: relative;
		margin-top: 0;
		padding: var(--space-2);
		font-size: 0.72rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
	/* The tail sits in a lower corner by default, pointing back toward the
	   seat — but a bubble that collision-avoidance has pushed down away from
	   its seat is closer to it at the TOP, so the tail moves up there too
	   (see the `collided` check next to where `tail-top` is set). */
	.bubble :global(.seat-tooltip::before) {
		content: '';
		position: absolute;
		bottom: 8px;
		border: 8px solid transparent;
	}
	.bubble.tail-top :global(.seat-tooltip::before) {
		top: 8px;
		bottom: auto;
	}
	.bubble.side-right :global(.seat-tooltip::before) {
		left: -8px;
		border-right-color: var(--color-highlight-ring);
		border-left-width: 0;
	}
	.bubble.side-left :global(.seat-tooltip::before) {
		right: -8px;
		border-left-color: var(--color-highlight-ring);
		border-right-width: 0;
	}
	@media print {
		/* The print view has its own static, named roster instead (see
		   .highlighted-list in +page.svelte). */
		.bubble-layer {
			display: none;
		}
	}
</style>
