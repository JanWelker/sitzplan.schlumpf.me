import type { Chamber } from '../api/types';
import nrPositions from './data/seatPositions.nr.json';
import srPositions from './data/seatPositions.sr.json';

export interface SeatPosition {
	x: number;
	y: number;
	/** Angle from the podium (0,0), 0 = rightmost, increasing counter-clockwise toward the left — used to orient each seat tile tangentially. */
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

export function getSeatPosition(chamber: Chamber, seatNumber: number): SeatPosition | undefined {
	const coords = POSITIONS[chamber][String(seatNumber)];
	if (!coords) return undefined;
	const [x, y] = coords;
	return { x, y, angleRad: Math.atan2(-y, x) };
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
