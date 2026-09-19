import { describe, expect, it } from 'vitest';
import { getSeatPosition, getChamberBounds } from './hemicycle';

describe('getSeatPosition', () => {
	it('resolves a position for every real Nationalrat seat number (1-200)', () => {
		for (let seatNumber = 1; seatNumber <= 200; seatNumber++) {
			expect(getSeatPosition('nr', seatNumber), `seat ${seatNumber}`).toBeDefined();
		}
	});

	it('resolves a position for every real Ständerat seat number (confirmed live: 1-45 and 47)', () => {
		const seatNumbers = [...Array.from({ length: 45 }, (_, i) => i + 1), 47];
		for (const seatNumber of seatNumbers) {
			expect(getSeatPosition('sr', seatNumber), `seat ${seatNumber}`).toBeDefined();
		}
	});

	it('returns undefined for a seat number outside the digitized plan', () => {
		expect(getSeatPosition('nr', 9999)).toBeUndefined();
		expect(getSeatPosition('sr', 46)).toBeUndefined(); // confirmed gap in the real numbering
	});

	it('keeps physically close seats at similar angles, including near the podium', () => {
		// A physically accurate layout can't have two seats that sit right
		// next to each other end up rotated in wildly different directions.
		// That was exactly the bug in the old angle-from-a-single-origin
		// formula: it was fine for outer/side seats but blew up for seats
		// close to the origin point itself (the front/center of the room),
		// since atan2 is extremely sensitive to position there. Seat number
		// order isn't physical adjacency, so find real neighbors by distance.
		for (const chamber of ['nr', 'sr'] as const) {
			const seatNumbers =
				chamber === 'nr'
					? Array.from({ length: 200 }, (_, i) => i + 1)
					: [...Array.from({ length: 45 }, (_, i) => i + 1), 47];
			const seats = seatNumbers
				.map((n) => ({ n, pos: getSeatPosition(chamber, n)! }))
				.filter((s) => s.pos);

			for (const seat of seats) {
				let nearest: (typeof seats)[number] | null = null;
				let nearestDist = Infinity;
				for (const other of seats) {
					if (other.n === seat.n) continue;
					const dist = Math.hypot(seat.pos.x - other.pos.x, seat.pos.y - other.pos.y);
					if (dist < nearestDist) {
						nearestDist = dist;
						nearest = other;
					}
				}
				if (!nearest || nearestDist > 35) continue;
				let diff = Math.abs(seat.pos.angleRad - nearest.pos.angleRad);
				if (diff > Math.PI) diff = 2 * Math.PI - diff;
				expect(diff, `${chamber} seats ${seat.n} and ${nearest.n}`).toBeLessThan(Math.PI / 2);
			}
		}
	});

	it('places every seat at or behind the podium (y <= 0, front row is y = 0)', () => {
		for (let seatNumber = 1; seatNumber <= 200; seatNumber++) {
			const pos = getSeatPosition('nr', seatNumber);
			expect(pos?.y).toBeLessThanOrEqual(0.01);
		}
	});
});

describe('getChamberBounds', () => {
	it('returns a roughly symmetric x-range for both chambers (a real hemicycle is left/right symmetric)', () => {
		for (const chamber of ['nr', 'sr'] as const) {
			const bounds = getChamberBounds(chamber);
			expect(Math.abs(bounds.minX + bounds.maxX)).toBeLessThan(5);
		}
	});

	it('gives the Nationalrat a larger footprint than the Ständerat (200 vs 46 seats)', () => {
		const nr = getChamberBounds('nr');
		const sr = getChamberBounds('sr');
		expect(nr.maxX - nr.minX).toBeGreaterThan(sr.maxX - sr.minX);
	});
});
