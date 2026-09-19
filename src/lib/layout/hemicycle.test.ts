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

	it('computes the angle from the podium consistently with x/y', () => {
		const pos = getSeatPosition('nr', 1);
		expect(pos).toBeDefined();
		expect(pos?.angleRad).toBeCloseTo(Math.atan2(-(pos?.y ?? 0), pos?.x ?? 0));
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
