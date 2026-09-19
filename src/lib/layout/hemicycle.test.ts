import { describe, expect, it } from 'vitest';
import { generateHemicycleLayout } from './hemicycle';

describe('generateHemicycleLayout', () => {
	it('produces exactly 200 positions for the Nationalrat (8 arcs)', () => {
		const positions = generateHemicycleLayout(200, 8);
		expect(positions).toHaveLength(200);
	});

	it('produces exactly 46 positions for the Ständerat (5 arcs)', () => {
		const positions = generateHemicycleLayout(46, 5);
		expect(positions).toHaveLength(46);
	});

	it('assigns sequential, unique seat numbers starting at 1', () => {
		const positions = generateHemicycleLayout(46, 5);
		const seatNumbers = positions.map((p) => p.seatNumber);
		expect(new Set(seatNumbers).size).toBe(46);
		expect(Math.min(...seatNumbers)).toBe(1);
		expect(Math.max(...seatNumbers)).toBe(46);
	});

	it('keeps arc seat-counts non-decreasing outward', () => {
		const positions = generateHemicycleLayout(200, 8);
		const perArc = new Map<number, number>();
		for (const p of positions) {
			perArc.set(p.arcIndex, (perArc.get(p.arcIndex) ?? 0) + 1);
		}
		const counts = [...perArc.entries()].sort((a, b) => a[0] - b[0]).map(([, count]) => count);
		for (let i = 0; i < counts.length - 1; i++) {
			expect(counts[i]).toBeLessThanOrEqual(counts[i + 1]);
		}
	});

	it('places every seat within the upper half-plane (y <= 0)', () => {
		const positions = generateHemicycleLayout(46, 5);
		for (const p of positions) {
			expect(p.y).toBeLessThanOrEqual(0.001);
		}
	});

	it('returns an empty array for zero seats', () => {
		expect(generateHemicycleLayout(0, 5)).toEqual([]);
	});

	it('is deterministic across repeated calls with the same input', () => {
		const a = generateHemicycleLayout(200, 8);
		const b = generateHemicycleLayout(200, 8);
		expect(a).toEqual(b);
	});
});
