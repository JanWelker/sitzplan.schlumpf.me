export interface SeatPosition {
	arcIndex: number;
	angleRad: number;
	x: number;
	y: number;
}

export interface HemicycleOptions {
	innerRadius?: number;
	radiusStep?: number;
	/** Angular gap (radians) inserted between adjacent non-empty groups. */
	groupGapRad?: number;
}

const DEFAULT_GROUP_GAP_RAD = (3 * Math.PI) / 180;

/**
 * Largest-remainder distribution of `count` seats across `arcCount`
 * concentric arcs, weighted so outer arcs get more (proportional to arc
 * index + 1), guaranteed non-decreasing outward.
 */
function distributeAcrossArcs(count: number, arcCount: number): number[] {
	if (arcCount <= 0) return [];
	if (count <= 0) return new Array(arcCount).fill(0);

	const weights = Array.from({ length: arcCount }, (_, i) => i + 1);
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);

	const raw = weights.map((w) => (count * w) / totalWeight);
	const counts = raw.map((v) => Math.floor(v));
	const remainder = count - counts.reduce((sum, c) => sum + c, 0);

	const byFractionDesc = raw
		.map((v, i) => ({ i, frac: v - Math.floor(v) }))
		.sort((a, b) => b.frac - a.frac);
	for (let k = 0; k < remainder; k++) {
		counts[byFractionDesc[k].i] += 1;
	}

	// Guard against rare rounding flips so seat counts never decrease outward.
	for (let i = 0; i < arcCount - 1; i++) {
		while (counts[i] > counts[i + 1]) {
			counts[i] -= 1;
			counts[i + 1] += 1;
		}
	}
	return counts;
}

/** Positions `count` seats across `arcCount` arcs within [angleStart, angleEnd]. */
function generateSubRange(
	count: number,
	arcCount: number,
	angleStart: number,
	angleEnd: number,
	innerRadius: number,
	radiusStep: number
): SeatPosition[] {
	const counts = distributeAcrossArcs(count, arcCount);
	const span = angleEnd - angleStart;
	const positions: SeatPosition[] = [];

	for (let arcIndex = 0; arcIndex < arcCount; arcIndex++) {
		const radius = innerRadius + arcIndex * radiusStep;
		const seatsInArc = counts[arcIndex];
		for (let j = 0; j < seatsInArc; j++) {
			const angleRad =
				seatsInArc === 1 ? angleStart + span / 2 : angleStart + (span * (j + 0.5)) / seatsInArc;
			positions.push({
				arcIndex,
				angleRad,
				x: radius * Math.cos(angleRad),
				y: -radius * Math.sin(angleRad)
			});
		}
	}
	return positions;
}

/**
 * Generates an original radial hemicycle layout with seats grouped into
 * contiguous angular wedges — one per entry in `groupSizes`, in the given
 * order (angle 0 = rightmost, increasing toward the left) — separated by a
 * small gap, matching the classic "party block" parliamentary-diagram
 * convention. This is NOT a copy of any specific real seating chart: no
 * seat-geometry API exists for the Swiss Federal Assembly (see
 * src/lib/api/parlGroups.ts), so this is an original approximation. Within
 * each group, seats are distributed across `arcCount` concentric arcs the
 * same way the whole chamber would be (more seats on outer arcs).
 *
 * The returned array has the same total length as the sum of `groupSizes`
 * and is ordered group-by-group (all of group 0's positions, then all of
 * group 1's, ...) — callers zip it against a same-order flattened seat
 * list, e.g. `groups.flatMap(g => g.seats)`.
 */
export function generateGroupedHemicycleLayout(
	groupSizes: number[],
	arcCount: number,
	options: HemicycleOptions = {}
): SeatPosition[] {
	if (arcCount <= 0) return [];

	const innerRadius = options.innerRadius ?? 100;
	const radiusStep = options.radiusStep ?? 40;
	const groupGapRad = options.groupGapRad ?? DEFAULT_GROUP_GAP_RAD;

	const nonEmptySizes = groupSizes.filter((size) => size > 0);
	const totalSeats = nonEmptySizes.reduce((sum, size) => sum + size, 0);
	if (totalSeats === 0) return [];

	const totalGap = groupGapRad * Math.max(nonEmptySizes.length - 1, 0);
	const availableAngle = Math.PI - totalGap;

	const positions: SeatPosition[] = [];
	let angleCursor = 0;
	for (const size of nonEmptySizes) {
		const width = (availableAngle * size) / totalSeats;
		positions.push(
			...generateSubRange(size, arcCount, angleCursor, angleCursor + width, innerRadius, radiusStep)
		);
		angleCursor += width + groupGapRad;
	}
	return positions;
}
