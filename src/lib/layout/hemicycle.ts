import type { Chamber } from '../api/types';
import nrPositions from './data/seatPositions.nr.json';
import srPositions from './data/seatPositions.sr.json';

export interface SeatPosition {
	x: number;
	y: number;
	/**
	 * The local direction of this seat's own row, in the same (x, y) space
	 * as the position itself — used to orient the seat tile tangentially so
	 * it "follows" the row it's actually part of. Deliberately NOT the angle
	 * from a single shared center: real rows aren't concentric arcs around
	 * one point, and near the podium (small x and y together) that angle is
	 * extremely sensitive to tiny position differences, producing wildly
	 * wrong rotations for exactly the front/center seats. See
	 * computeTangentAngles for how this is derived from real neighbors.
	 */
	angleRad: number;
}

export interface ChamberBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

type PositionTable = Record<string, number[]>;

/**
 * Real seat coordinates, digitized from the Parliamentary Services' own
 * official seat-plan PDFs (sitzplan-nr.pdf / sitzplan-sr.pdf — each seat
 * number is printed as real, positioned text in those documents). See
 * scripts/extract-seat-positions.py for how src/lib/layout/data/*.json was
 * derived, and re-run it if parlament.ch republishes updated plans.
 *
 * This deliberately replaces an earlier invented approximation (seats
 * grouped into idealized per-party wedges) — the real room's seating,
 * including the front-row officer/secretary seats, does not follow a
 * clean party-wedge pattern, and matching the real physical layout is
 * this project's core requirement, not just showing correct party
 * membership.
 *
 * Coordinates are normalized so (0,0) is the frontmost row at the
 * horizontal center (roughly the podium), x is left/right, and y is
 * negative toward the back of the room.
 */
const POSITIONS: Record<Chamber, PositionTable> = {
	nr: nrPositions,
	sr: srPositions
};

interface SeatCoord {
	seatNumber: number;
	x: number;
	y: number;
}

const tangentAngleCache = new Map<Chamber, Map<number, number>>();

/**
 * For each seat, find its nearest same-row neighbor(s) — another seat that
 * sits mostly to the side of it rather than mostly in front of or behind it
 * — and use the direction toward them as that seat's rotation. This reads
 * the actual local curve of each row straight from the digitized data
 * instead of assuming every row is a concentric arc around one point, which
 * breaks down badly near the podium (see the angleRad doc comment above).
 */
function computeTangentAngles(chamber: Chamber): Map<number, number> {
	const cached = tangentAngleCache.get(chamber);
	if (cached) return cached;

	const seats: SeatCoord[] = Object.entries(POSITIONS[chamber]).map(([seatNumber, [x, y]]) => ({
		seatNumber: Number(seatNumber),
		x,
		y
	}));

	const angles = new Map<number, number>();
	for (const seat of seats) {
		let left: SeatCoord | null = null;
		let right: SeatCoord | null = null;
		let leftDist = Infinity;
		let rightDist = Infinity;

		for (const other of seats) {
			if (other === seat) continue;
			const dx = other.x - seat.x;
			const dy = other.y - seat.y;
			// Skip seats that sit mostly ahead of/behind this one (a
			// different row) rather than mostly beside it (this row).
			if (Math.abs(dy) >= Math.abs(dx)) continue;
			const dist = Math.hypot(dx, dy);
			if (dx < 0 && dist < leftDist) {
				leftDist = dist;
				left = other;
			} else if (dx > 0 && dist < rightDist) {
				rightDist = dist;
				right = other;
			}
		}

		// A row's last seat has no same-row neighbor beyond it, so the
		// nearest thing on that side is really a seat from an adjacent row —
		// much farther away than the genuine same-row neighbor on the other
		// side. Trust the near neighbor alone rather than averaging in that
		// distant, different-row point, which would drag the tangent off at
		// a diagonal (exactly what produced skewed rotations at row ends).
		const bothComparable =
			left && right && Math.max(leftDist, rightDist) <= 2 * Math.min(leftDist, rightDist);

		let angleRad: number;
		if (bothComparable) {
			angleRad = Math.atan2(right!.y - left!.y, right!.x - left!.x);
		} else if (right && rightDist <= leftDist) {
			angleRad = Math.atan2(right.y - seat.y, right.x - seat.x);
		} else if (left) {
			angleRad = Math.atan2(seat.y - left.y, seat.x - left.x);
		} else if (right) {
			angleRad = Math.atan2(right.y - seat.y, right.x - seat.x);
		} else {
			angleRad = 0; // No plausible row-mate found — draw level rather than guess.
		}
		angles.set(seat.seatNumber, angleRad);
	}

	tangentAngleCache.set(chamber, angles);
	return angles;
}

export function getSeatPosition(chamber: Chamber, seatNumber: number): SeatPosition | undefined {
	const coords = POSITIONS[chamber][String(seatNumber)];
	if (!coords) return undefined;
	const [x, y] = coords;
	const angleRad = computeTangentAngles(chamber).get(seatNumber) ?? 0;
	return { x, y, angleRad };
}

export function getChamberBounds(chamber: Chamber): ChamberBounds {
	const values = Object.values(POSITIONS[chamber]);
	const xs = values.map((v) => v[0]);
	const ys = values.map((v) => v[1]);
	return {
		minX: Math.min(...xs),
		maxX: Math.max(...xs),
		minY: Math.min(...ys),
		maxY: Math.max(...ys)
	};
}
