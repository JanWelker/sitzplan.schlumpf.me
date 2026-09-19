export interface SeatPosition {
	/** 1-based, maps sequentially onto the API's `SeatNumber` (arc 0 gets seats 1..k). */
	seatNumber: number;
	arcIndex: number;
	angleRad: number;
	x: number;
	y: number;
}

export interface HemicycleOptions {
	innerRadius?: number;
	radiusStep?: number;
}

/**
 * Generates an original radial/fan hemicycle seat layout — NOT a copy of
 * parlament.ch's own geometry (no such API exists; their exact seat paths
 * are hardcoded in their proprietary client bundle). Seats are distributed
 * across `arcCount` concentric 180° arcs, with more seats on outer arcs
 * (proportional to arc index) so seat density stays visually even.
 */
export function generateHemicycleLayout(
	seatCount: number,
	arcCount: number,
	options: HemicycleOptions = {}
): SeatPosition[] {
	if (seatCount <= 0 || arcCount <= 0) return [];

	const innerRadius = options.innerRadius ?? 100;
	const radiusStep = options.radiusStep ?? 40;

	const weights = Array.from({ length: arcCount }, (_, i) => i + 1);
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);

	const raw = weights.map((w) => (seatCount * w) / totalWeight);
	const counts = raw.map((v) => Math.floor(v));
	const remainder = seatCount - counts.reduce((sum, c) => sum + c, 0);

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

	const positions: SeatPosition[] = [];
	let seatNumber = 1;
	for (let arcIndex = 0; arcIndex < arcCount; arcIndex++) {
		const radius = innerRadius + arcIndex * radiusStep;
		const seatsInArc = counts[arcIndex];
		for (let j = 0; j < seatsInArc; j++) {
			const angleRad = seatsInArc === 1 ? Math.PI / 2 : (Math.PI * (j + 0.5)) / seatsInArc;
			positions.push({
				seatNumber,
				arcIndex,
				angleRad,
				x: radius * Math.cos(angleRad),
				y: -radius * Math.sin(angleRad)
			});
			seatNumber += 1;
		}
	}
	return positions;
}
